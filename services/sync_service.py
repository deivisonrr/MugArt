import threading
import time
from datetime import datetime

from database.local_connection import get_local_connection
from database.connection import get_connection
from services.sync_site_pedidos_service import SyncSitePedidosService


class SyncService:

    INTERVALO = 60

    TABELAS = [
        "clientes",
        "fornecedores",
        "produtos",
        "pedidos",
        "itens_pedido",
        "vendas",
        "itens_venda",
        "financeiro",
        "compras",
        "movimentacoes_estoque",
    ]

    rodando = False

    @staticmethod
    def iniciar():
        if SyncService.rodando:
            return

        SyncService.rodando = True

        thread = threading.Thread(
            target=SyncService.loop,
            daemon=True
        )
        thread.start()

        print("SyncService iniciado.")

    @staticmethod
    def parar():
        SyncService.rodando = False
        print("SyncService parado.")

    @staticmethod
    def loop():
        while SyncService.rodando:
            try:
                SyncService.sincronizar_tudo()
            except Exception as erro:
                print("Erro geral no SyncService:", erro)

            time.sleep(SyncService.INTERVALO)

    @staticmethod
    def garantir_controle():
        conn = get_local_connection()
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sync_control (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tabela TEXT UNIQUE,
                ultima_sincronizacao TEXT
            )
        """)

        conn.commit()
        conn.close()

    @staticmethod
    def ultima_sync(tabela):
        SyncService.garantir_controle()

        conn = get_local_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT ultima_sincronizacao
            FROM sync_control
            WHERE tabela = ?
        """, (tabela,))

        row = cursor.fetchone()
        conn.close()

        if row:
            return row[0]

        return "2000-01-01 00:00:00"

    @staticmethod
    def salvar_ultima_sync(tabela):
        agora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        conn = get_local_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO sync_control (
                tabela,
                ultima_sincronizacao
            ) VALUES (?, ?)
            ON CONFLICT(tabela)
            DO UPDATE SET ultima_sincronizacao = excluded.ultima_sincronizacao
        """, (tabela, agora))

        conn.commit()
        conn.close()

    @staticmethod
    def colunas_locais(tabela):
        conn = get_local_connection()
        cursor = conn.cursor()

        cursor.execute(f"PRAGMA table_info({tabela})")
        colunas = [linha[1] for linha in cursor.fetchall()]

        conn.close()
        return colunas

    @staticmethod
    def sincronizar_tudo():
        # 1. Converte pedidos do site para o formato usado pelo ERP.
        try:
            SyncSitePedidosService.sincronizar()
        except Exception as erro:
            print("Erro ao importar pedidos do site:", erro)

        # 2. Baixa as tabelas ERP do PostgreSQL para o SQLite local.
        for tabela in SyncService.TABELAS:
            try:
                SyncService.sincronizar_tabela(tabela)
            except Exception as erro:
                print(f"Erro ao sincronizar {tabela}:", erro)

    @staticmethod
    def sincronizar_tabela(tabela):
        ultima = SyncService.ultima_sync(tabela)

        conn_remoto = get_connection()
        cursor_remoto = conn_remoto.cursor()

        # Nem todas as tabelas antigas tinham atualizado_em.
        cursor_remoto.execute("""
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = %s
                  AND column_name = 'atualizado_em'
            )
        """, (tabela,))

        tem_atualizado_em = bool(cursor_remoto.fetchone()[0])

        if tem_atualizado_em:
            cursor_remoto.execute(f"""
                SELECT *
                FROM {tabela}
                WHERE atualizado_em > %s
                ORDER BY atualizado_em ASC
            """, (ultima,))
        else:
            cursor_remoto.execute(f"""
                SELECT *
                FROM {tabela}
                ORDER BY id ASC
            """)

        dados = cursor_remoto.fetchall()
        colunas_remotas = [desc[0] for desc in cursor_remoto.description]

        cursor_remoto.close()
        conn_remoto.close()

        if not dados:
            return

        colunas_local = SyncService.colunas_locais(tabela)

        colunas_validas = [
            coluna for coluna in colunas_remotas
            if coluna in colunas_local
        ]

        if "id" not in colunas_validas:
            print(f"Tabela {tabela} ignorada: sem coluna id.")
            return

        conn_local = get_local_connection()
        cursor_local = conn_local.cursor()

        for linha in dados:
            registro = dict(zip(colunas_remotas, linha))

            valores = [
                SyncService._valor_sqlite(registro.get(coluna))
                for coluna in colunas_validas
            ]

            placeholders = ", ".join(["?"] * len(colunas_validas))
            colunas_sql = ", ".join(colunas_validas)

            updates = ", ".join([
                f"{coluna} = excluded.{coluna}"
                for coluna in colunas_validas
                if coluna != "id"
            ])

            if updates:
                sql = f"""
                    INSERT INTO {tabela} (
                        {colunas_sql}
                    ) VALUES (
                        {placeholders}
                    )
                    ON CONFLICT(id)
                    DO UPDATE SET
                        {updates}
                """
            else:
                sql = f"""
                    INSERT OR IGNORE INTO {tabela} (
                        {colunas_sql}
                    ) VALUES (
                        {placeholders}
                    )
                """

            cursor_local.execute(sql, valores)

        conn_local.commit()
        conn_local.close()

        if tem_atualizado_em:
            SyncService.salvar_ultima_sync(tabela)

        print(f"Sincronizado: {tabela} - {len(dados)} registro(s)")

    @staticmethod
    def _valor_sqlite(valor):
        """
        Converte tipos do PostgreSQL que o sqlite3 não aceita diretamente.
        """
        if valor is None:
            return None

        if isinstance(valor, (str, int, float, bytes)):
            return valor

        if isinstance(valor, bool):
            return int(valor)

        if hasattr(valor, "isoformat"):
            return valor.isoformat(sep=" ")

        return str(valor)
