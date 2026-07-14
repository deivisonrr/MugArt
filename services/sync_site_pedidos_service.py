"""
Importa pedidos feitos no site MugArt para as tabelas usadas pelo ERP.

Origem (site):
- customers
- orders
- order_items
- order_addresses
- payments

Destino (ERP):
- clientes
- pedidos
- itens_pedido
- ordens_producao

A importação é idempotente: o mesmo pedido do site não é duplicado.
"""

from __future__ import annotations

import json
import traceback
from contextlib import closing
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

from database.connection import get_connection


class SyncSitePedidosService:
    CANAL = "Site"

    STATUS_MAP = {
        "pending": "PENDENTE",
        "approved": "PAGO",
        "paid": "PAGO",
        "authorized": "PAGO",
        "in_process": "PENDENTE",
        "in_mediation": "PENDENTE",
        "production": "EM PRODUÇÃO",
        "ready": "PRONTO",
        "sent": "ENVIADO",
        "shipped": "ENVIADO",
        "delivered": "ENTREGUE",
        "canceled": "CANCELADO",
        "cancelled": "CANCELADO",
        "rejected": "CANCELADO",
        "refunded": "CANCELADO",
        "charged_back": "CANCELADO",
    }

    PAYMENT_MAP = {
        "pix": "PIX",
        "credit_card": "Cartão de Crédito",
        "debit_card": "Cartão de Débito",
        "ticket": "Boleto",
        "bank_transfer": "Transferência",
        "combined": "Outro",
    }

    @staticmethod
    def sincronizar(limite: int = 100) -> Dict[str, int]:
        """
        Importa pedidos do site ainda não sincronizados.

        Retorna:
        {
            "processados": 0,
            "importados": 0,
            "atualizados": 0,
            "erros": 0
        }
        """
        resultado = {
            "processados": 0,
            "importados": 0,
            "atualizados": 0,
            "erros": 0,
        }

        SyncSitePedidosService.garantir_estrutura()

        with closing(get_connection()) as conn:
            conn.autocommit = False

            pedidos_site = SyncSitePedidosService._buscar_pedidos_site(
                conn,
                limite=limite,
            )

            for pedido_site in pedidos_site:
                resultado["processados"] += 1

                try:
                    importado = SyncSitePedidosService._importar_pedido(
                        conn,
                        pedido_site,
                    )

                    if importado:
                        resultado["importados"] += 1
                    else:
                        resultado["atualizados"] += 1

                    conn.commit()

                except Exception as erro:
                    conn.rollback()
                    resultado["erros"] += 1

                    print(
                        "[Site→ERP] Erro no pedido",
                        pedido_site.get("id"),
                        ":",
                        erro,
                    )
                    traceback.print_exc()

                    SyncSitePedidosService._marcar_erro_seguro(
                        pedido_site.get("id"),
                        str(erro),
                    )

        if resultado["processados"]:
            print(
                "[Site→ERP]",
                f"{resultado['processados']} processado(s),",
                f"{resultado['importados']} importado(s),",
                f"{resultado['atualizados']} atualizado(s),",
                f"{resultado['erros']} erro(s).",
            )

        return resultado

    @staticmethod
    def garantir_estrutura() -> None:
        """
        Cria/adiciona apenas as estruturas necessárias à ponte.
        Não apaga nem renomeia colunas existentes.
        """
        with closing(get_connection()) as conn:
            with conn.cursor() as cursor:
                # Controle na tabela de origem.
                SyncSitePedidosService._adicionar_coluna(
                    cursor, "orders", "source", "TEXT DEFAULT 'site'"
                )
                SyncSitePedidosService._adicionar_coluna(
                    cursor, "orders", "erp_synced", "BOOLEAN NOT NULL DEFAULT FALSE"
                )
                SyncSitePedidosService._adicionar_coluna(
                    cursor, "orders", "erp_synced_at", "TIMESTAMPTZ"
                )
                SyncSitePedidosService._adicionar_coluna(
                    cursor, "orders", "erp_sync_error", "TEXT"
                )

                # Referências e dados do pedido do site na tabela ERP.
                colunas_pedidos = {
                    "site_order_id": "UUID",
                    "numero_site": "TEXT",
                    "cliente_id": "INTEGER",
                    "telefone": "TEXT",
                    "cpf_cnpj": "TEXT",
                    "canal": "TEXT DEFAULT 'Site'",
                    "forma_pagamento": "TEXT",
                    "status_pagamento": "TEXT",
                    "subtotal": "DOUBLE PRECISION DEFAULT 0",
                    "frete": "DOUBLE PRECISION DEFAULT 0",
                    "desconto_geral": "DOUBLE PRECISION DEFAULT 0",
                    "endereco_entrega": "TEXT",
                    "cep_entrega": "TEXT",
                    "transportadora": "TEXT",
                    "servico_entrega": "TEXT",
                    "prazo_entrega_dias": "INTEGER",
                    "codigo_rastreio": "TEXT",
                    "origem": "TEXT DEFAULT 'SITE'",
                    "sincronizado": "INTEGER DEFAULT 1",
                    "atualizado_em": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
                }

                for nome, tipo in colunas_pedidos.items():
                    SyncSitePedidosService._adicionar_coluna(
                        cursor, "pedidos", nome, tipo
                    )

                cursor.execute("""
                    CREATE UNIQUE INDEX IF NOT EXISTS
                    idx_pedidos_site_order_id
                    ON pedidos(site_order_id)
                    WHERE site_order_id IS NOT NULL
                """)

                # Tabela de itens, caso ainda não exista.
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS itens_pedido (
                        id SERIAL PRIMARY KEY,
                        pedido_id INTEGER NOT NULL,
                        produto_id TEXT,
                        produto_nome TEXT,
                        categoria TEXT,
                        sku TEXT,
                        variacao_id TEXT,
                        variacao TEXT,
                        quantidade DOUBLE PRECISION DEFAULT 1,
                        preco_unitario DOUBLE PRECISION DEFAULT 0,
                        desconto_percentual DOUBLE PRECISION DEFAULT 0,
                        subtotal DOUBLE PRECISION DEFAULT 0,
                        imagem_url TEXT,
                        arte_cliente TEXT,
                        observacao_item TEXT,
                        site_order_item_id UUID,
                        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                colunas_itens = {
                    "produto_nome": "TEXT",
                    "categoria": "TEXT",
                    "sku": "TEXT",
                    "variacao_id": "TEXT",
                    "variacao": "TEXT",
                    "imagem_url": "TEXT",
                    "arte_cliente": "TEXT",
                    "site_order_item_id": "UUID",
                    "atualizado_em": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
                }

                for nome, tipo in colunas_itens.items():
                    SyncSitePedidosService._adicionar_coluna(
                        cursor, "itens_pedido", nome, tipo
                    )

                cursor.execute("""
                    CREATE UNIQUE INDEX IF NOT EXISTS
                    idx_itens_pedido_site_item_id
                    ON itens_pedido(site_order_item_id)
                    WHERE site_order_item_id IS NOT NULL
                """)

                # Campos adicionais no cliente para vinculação ao site.
                colunas_clientes = {
                    "site_customer_id": "UUID",
                    "auth_user_id": "UUID",
                    "origem": "TEXT DEFAULT 'SITE'",
                    "sincronizado": "INTEGER DEFAULT 1",
                    "atualizado_em": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
                }

                for nome, tipo in colunas_clientes.items():
                    SyncSitePedidosService._adicionar_coluna(
                        cursor, "clientes", nome, tipo
                    )

                cursor.execute("""
                    CREATE UNIQUE INDEX IF NOT EXISTS
                    idx_clientes_site_customer_id
                    ON clientes(site_customer_id)
                    WHERE site_customer_id IS NOT NULL
                """)

                # Índice para buscar pedidos ainda não importados.
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS
                    idx_orders_erp_sync
                    ON orders(erp_synced, created_at)
                """)

            conn.commit()

    @staticmethod
    def _buscar_pedidos_site(
        conn,
        limite: int,
    ) -> List[Dict[str, Any]]:
        colunas = SyncSitePedidosService._colunas_tabela(conn, "orders")

        if not colunas:
            print("[Site→ERP] Tabela orders não encontrada.")
            return []

        # Traz novos pedidos e também pedidos alterados após a última importação.
        where = """
            COALESCE(erp_synced, FALSE) = FALSE
            OR (
                updated_at IS NOT NULL
                AND erp_synced_at IS NOT NULL
                AND updated_at > erp_synced_at
            )
        """ if "updated_at" in colunas else "COALESCE(erp_synced, FALSE) = FALSE"

        order_col = (
            "created_at"
            if "created_at" in colunas
            else "id"
        )

        with conn.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT *
                FROM orders
                WHERE {where}
                ORDER BY {order_col} ASC
                LIMIT %s
                """,
                (limite,),
            )

            nomes = [desc[0] for desc in cursor.description]

            return [
                dict(zip(nomes, linha))
                for linha in cursor.fetchall()
            ]

    @staticmethod
    def _importar_pedido(
        conn,
        pedido_site: Dict[str, Any],
    ) -> bool:
        site_order_id = pedido_site["id"]

        cliente_site = SyncSitePedidosService._buscar_cliente_site(
            conn,
            pedido_site,
        )

        endereco_site = SyncSitePedidosService._buscar_endereco_site(
            conn,
            site_order_id,
        )

        pagamento_site = SyncSitePedidosService._buscar_pagamento_site(
            conn,
            site_order_id,
        )

        itens_site = SyncSitePedidosService._buscar_itens_site(
            conn,
            site_order_id,
        )

        cliente_erp_id = SyncSitePedidosService._garantir_cliente_erp(
            conn,
            cliente_site,
            endereco_site,
            pedido_site,
        )

        pedido_existente_id = SyncSitePedidosService._buscar_pedido_erp_id(
            conn,
            site_order_id,
        )

        pedido_erp_id = SyncSitePedidosService._salvar_pedido_erp(
            conn,
            pedido_site,
            cliente_site,
            endereco_site,
            pagamento_site,
            cliente_erp_id,
            pedido_existente_id,
        )

        SyncSitePedidosService._salvar_itens_erp(
            conn,
            pedido_erp_id,
            itens_site,
            pedido_site,
        )

        SyncSitePedidosService._garantir_ordem_producao(
            conn,
            pedido_erp_id,
            pedido_site,
            pagamento_site,
        )

        SyncSitePedidosService._marcar_sincronizado(
            conn,
            site_order_id,
        )

        return pedido_existente_id is None

    @staticmethod
    def _buscar_cliente_site(
        conn,
        pedido: Dict[str, Any],
    ) -> Dict[str, Any]:
        customer_id = (
            pedido.get("customer_id")
            or pedido.get("cliente_id")
        )

        if customer_id and SyncSitePedidosService._tabela_existe(
            conn, "customers"
        ):
            colunas = SyncSitePedidosService._colunas_tabela(
                conn, "customers"
            )

            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT * FROM customers WHERE id = %s LIMIT 1",
                    (customer_id,),
                )
                row = cursor.fetchone()

                if row:
                    return dict(
                        zip(
                            [d[0] for d in cursor.description],
                            row,
                        )
                    )

        # Fallback para dados gravados diretamente no pedido.
        return {
            "id": customer_id,
            "auth_user_id": (
                pedido.get("user_id")
                or pedido.get("auth_user_id")
            ),
            "name": (
                pedido.get("customer_name")
                or pedido.get("nome")
                or pedido.get("cliente")
                or "Cliente do site"
            ),
            "email": (
                pedido.get("customer_email")
                or pedido.get("email")
                or ""
            ),
            "phone": (
                pedido.get("customer_phone")
                or pedido.get("telefone")
                or pedido.get("whatsapp")
                or ""
            ),
            "document": (
                pedido.get("customer_document")
                or pedido.get("cpf_cnpj")
                or pedido.get("document")
                or ""
            ),
        }

    @staticmethod
    def _buscar_endereco_site(
        conn,
        site_order_id,
    ) -> Dict[str, Any]:
        if not SyncSitePedidosService._tabela_existe(
            conn, "order_addresses"
        ):
            return {}

        colunas = SyncSitePedidosService._colunas_tabela(
            conn, "order_addresses"
        )

        chave = (
            "order_id"
            if "order_id" in colunas
            else "pedido_id"
            if "pedido_id" in colunas
            else None
        )

        if not chave:
            return {}

        with conn.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT *
                FROM order_addresses
                WHERE {chave} = %s
                ORDER BY created_at DESC NULLS LAST
                LIMIT 1
                """,
                (site_order_id,),
            )
            row = cursor.fetchone()

            if not row:
                return {}

            return dict(
                zip(
                    [d[0] for d in cursor.description],
                    row,
                )
            )

    @staticmethod
    def _buscar_pagamento_site(
        conn,
        site_order_id,
    ) -> Dict[str, Any]:
        if not SyncSitePedidosService._tabela_existe(
            conn, "payments"
        ):
            return {}

        colunas = SyncSitePedidosService._colunas_tabela(
            conn, "payments"
        )

        chave = (
            "order_id"
            if "order_id" in colunas
            else "pedido_id"
            if "pedido_id" in colunas
            else None
        )

        if not chave:
            return {}

        order_col = (
            "created_at"
            if "created_at" in colunas
            else "id"
        )

        with conn.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT *
                FROM payments
                WHERE {chave} = %s
                ORDER BY {order_col} DESC
                LIMIT 1
                """,
                (site_order_id,),
            )
            row = cursor.fetchone()

            if not row:
                return {}

            return dict(
                zip(
                    [d[0] for d in cursor.description],
                    row,
                )
            )

    @staticmethod
    def _buscar_itens_site(
        conn,
        site_order_id,
    ) -> List[Dict[str, Any]]:
        if not SyncSitePedidosService._tabela_existe(
            conn, "order_items"
        ):
            return []

        colunas = SyncSitePedidosService._colunas_tabela(
            conn, "order_items"
        )

        chave = (
            "order_id"
            if "order_id" in colunas
            else "pedido_id"
            if "pedido_id" in colunas
            else None
        )

        if not chave:
            return []

        with conn.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT *
                FROM order_items
                WHERE {chave} = %s
                ORDER BY created_at ASC NULLS LAST, id ASC
                """,
                (site_order_id,),
            )

            nomes = [d[0] for d in cursor.description]

            return [
                dict(zip(nomes, row))
                for row in cursor.fetchall()
            ]

    @staticmethod
    def _garantir_cliente_erp(
        conn,
        cliente_site: Dict[str, Any],
        endereco_site: Dict[str, Any],
        pedido_site: Dict[str, Any],
    ) -> int:
        site_customer_id = cliente_site.get("id")

        nome = SyncSitePedidosService._primeiro(
            cliente_site,
            "name",
            "nome",
            "full_name",
            default="Cliente do site",
        )
        email = SyncSitePedidosService._primeiro(
            cliente_site,
            "email",
            default="",
        )
        telefone = SyncSitePedidosService._primeiro(
            cliente_site,
            "phone",
            "telefone",
            "whatsapp",
            default="",
        )
        documento = SyncSitePedidosService._primeiro(
            cliente_site,
            "document",
            "cpf_cnpj",
            "cpf",
            "cnpj",
            default="",
        )
        auth_user_id = SyncSitePedidosService._primeiro(
            cliente_site,
            "auth_user_id",
            "user_id",
            default=None,
        )

        cliente_id = SyncSitePedidosService._localizar_cliente_erp(
            conn,
            site_customer_id=site_customer_id,
            documento=documento,
            email=email,
            telefone=telefone,
        )

        endereco = SyncSitePedidosService._endereco_para_campos(
            endereco_site
        )

        with conn.cursor() as cursor:
            if cliente_id:
                cursor.execute(
                    """
                    UPDATE clientes
                    SET
                        nome = COALESCE(NULLIF(%s, ''), nome),
                        email = COALESCE(NULLIF(%s, ''), email),
                        telefone = COALESCE(NULLIF(%s, ''), telefone),
                        whatsapp = COALESCE(NULLIF(%s, ''), whatsapp),
                        cpf_cnpj = COALESCE(NULLIF(%s, ''), cpf_cnpj),
                        cep = COALESCE(NULLIF(%s, ''), cep),
                        endereco = COALESCE(NULLIF(%s, ''), endereco),
                        numero = COALESCE(NULLIF(%s, ''), numero),
                        complemento = COALESCE(NULLIF(%s, ''), complemento),
                        bairro = COALESCE(NULLIF(%s, ''), bairro),
                        cidade = COALESCE(NULLIF(%s, ''), cidade),
                        estado = COALESCE(NULLIF(%s, ''), estado),
                        site_customer_id = COALESCE(%s, site_customer_id),
                        auth_user_id = COALESCE(%s, auth_user_id),
                        origem = 'SITE',
                        sincronizado = 1,
                        atualizado_em = CURRENT_TIMESTAMP
                    WHERE id = %s
                    """,
                    (
                        nome,
                        email,
                        telefone,
                        telefone,
                        documento,
                        endereco["cep"],
                        endereco["rua"],
                        endereco["numero"],
                        endereco["complemento"],
                        endereco["bairro"],
                        endereco["cidade"],
                        endereco["estado"],
                        site_customer_id,
                        auth_user_id,
                        cliente_id,
                    ),
                )
                return int(cliente_id)

            cursor.execute(
                """
                INSERT INTO clientes (
                    nome,
                    email,
                    telefone,
                    whatsapp,
                    cpf_cnpj,
                    cep,
                    endereco,
                    numero,
                    complemento,
                    bairro,
                    cidade,
                    estado,
                    observacoes,
                    site_customer_id,
                    auth_user_id,
                    origem,
                    sincronizado,
                    atualizado_em
                )
                VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    'SITE', 1, CURRENT_TIMESTAMP
                )
                RETURNING id
                """,
                (
                    nome,
                    email,
                    telefone,
                    telefone,
                    documento,
                    endereco["cep"],
                    endereco["rua"],
                    endereco["numero"],
                    endereco["complemento"],
                    endereco["bairro"],
                    endereco["cidade"],
                    endereco["estado"],
                    "Cliente cadastrado automaticamente pelo site.",
                    site_customer_id,
                    auth_user_id,
                ),
            )

            return int(cursor.fetchone()[0])

    @staticmethod
    def _localizar_cliente_erp(
        conn,
        site_customer_id,
        documento: str,
        email: str,
        telefone: str,
    ) -> Optional[int]:
        criterios: List[Tuple[str, Any]] = []

        if site_customer_id:
            criterios.append(("site_customer_id", site_customer_id))

        documento_limpo = SyncSitePedidosService._somente_numeros(
            documento
        )
        telefone_limpo = SyncSitePedidosService._somente_numeros(
            telefone
        )

        with conn.cursor() as cursor:
            for coluna, valor in criterios:
                cursor.execute(
                    f"SELECT id FROM clientes WHERE {coluna} = %s LIMIT 1",
                    (valor,),
                )
                row = cursor.fetchone()
                if row:
                    return int(row[0])

            if documento_limpo:
                cursor.execute(
                    """
                    SELECT id
                    FROM clientes
                    WHERE regexp_replace(
                        COALESCE(cpf_cnpj, ''),
                        '[^0-9]',
                        '',
                        'g'
                    ) = %s
                    LIMIT 1
                    """,
                    (documento_limpo,),
                )
                row = cursor.fetchone()
                if row:
                    return int(row[0])

            if email:
                cursor.execute(
                    """
                    SELECT id
                    FROM clientes
                    WHERE LOWER(COALESCE(email, '')) = LOWER(%s)
                    LIMIT 1
                    """,
                    (email,),
                )
                row = cursor.fetchone()
                if row:
                    return int(row[0])

            if telefone_limpo:
                cursor.execute(
                    """
                    SELECT id
                    FROM clientes
                    WHERE regexp_replace(
                        COALESCE(NULLIF(whatsapp, ''), telefone, ''),
                        '[^0-9]',
                        '',
                        'g'
                    ) = %s
                    LIMIT 1
                    """,
                    (telefone_limpo,),
                )
                row = cursor.fetchone()
                if row:
                    return int(row[0])

        return None

    @staticmethod
    def _buscar_pedido_erp_id(
        conn,
        site_order_id,
    ) -> Optional[int]:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT id
                FROM pedidos
                WHERE site_order_id = %s
                LIMIT 1
                """,
                (site_order_id,),
            )
            row = cursor.fetchone()

            return int(row[0]) if row else None

    @staticmethod
    def _salvar_pedido_erp(
        conn,
        pedido: Dict[str, Any],
        cliente: Dict[str, Any],
        endereco: Dict[str, Any],
        pagamento: Dict[str, Any],
        cliente_erp_id: int,
        pedido_existente_id: Optional[int],
    ) -> int:
        status_site = str(
            pedido.get("status")
            or pedido.get("order_status")
            or "pending"
        ).lower()

        payment_status = str(
            pagamento.get("status")
            or pedido.get("payment_status")
            or ""
        ).lower()

        status_erp = SyncSitePedidosService.STATUS_MAP.get(
            status_site,
            SyncSitePedidosService.STATUS_MAP.get(
                payment_status,
                "PENDENTE",
            ),
        )

        forma_pagamento_raw = (
            pagamento.get("payment_method")
            or pagamento.get("payment_type")
            or pedido.get("payment_method")
            or pedido.get("forma_pagamento")
            or ""
        )
        forma_pagamento = SyncSitePedidosService.PAYMENT_MAP.get(
            str(forma_pagamento_raw).lower(),
            str(forma_pagamento_raw or "PIX"),
        )

        nome_cliente = SyncSitePedidosService._primeiro(
            cliente,
            "name",
            "nome",
            "full_name",
            default=(
                pedido.get("customer_name")
                or pedido.get("cliente")
                or "Cliente do site"
            ),
        )
        telefone = SyncSitePedidosService._primeiro(
            cliente,
            "phone",
            "telefone",
            "whatsapp",
            default=pedido.get("customer_phone") or "",
        )
        documento = SyncSitePedidosService._primeiro(
            cliente,
            "document",
            "cpf_cnpj",
            default=pedido.get("customer_document") or "",
        )

        subtotal = SyncSitePedidosService._numero(
            pedido.get("subtotal")
            or pedido.get("items_total")
            or pedido.get("valor_produtos")
        )
        frete = SyncSitePedidosService._numero(
            pedido.get("shipping_cost")
            or pedido.get("shipping_amount")
            or pedido.get("freight")
            or pedido.get("frete")
        )
        desconto = SyncSitePedidosService._numero(
            pedido.get("discount")
            or pedido.get("discount_amount")
            or pedido.get("desconto")
        )
        total = SyncSitePedidosService._numero(
            pedido.get("total")
            or pedido.get("total_amount")
            or pedido.get("amount")
            or pedido.get("valor_total")
        )

        endereco_campos = SyncSitePedidosService._endereco_para_campos(
            endereco
        )
        endereco_texto = ", ".join(
            parte
            for parte in [
                endereco_campos["rua"],
                endereco_campos["numero"],
                endereco_campos["complemento"],
                endereco_campos["bairro"],
                endereco_campos["cidade"],
                endereco_campos["estado"],
            ]
            if parte
        )

        numero_site = str(
            pedido.get("order_number")
            or pedido.get("number")
            or pedido.get("numero")
            or pedido.get("id")
        )

        data_pedido = (
            pedido.get("created_at")
            or pedido.get("data_pedido")
            or datetime.now()
        )

        data_entrega = (
            pedido.get("delivery_date")
            or pedido.get("estimated_delivery_date")
            or pedido.get("data_entrega")
        )

        transportadora = (
            pedido.get("shipping_company")
            or pedido.get("carrier")
            or pedido.get("transportadora")
            or ""
        )
        servico = (
            pedido.get("shipping_service")
            or pedido.get("service")
            or pedido.get("servico_entrega")
            or ""
        )
        prazo = SyncSitePedidosService._inteiro(
            pedido.get("delivery_time")
            or pedido.get("delivery_days")
            or pedido.get("prazo_entrega_dias")
        )
        rastreio = (
            pedido.get("tracking_code")
            or pedido.get("codigo_rastreio")
            or ""
        )

        observacao = SyncSitePedidosService._montar_observacao_pedido(
            pedido,
            endereco,
            pagamento,
        )

        quantidade_total = SyncSitePedidosService._inteiro(
            pedido.get("items_quantity")
            or pedido.get("quantity")
            or pedido.get("quantidade")
        ) or 0

        with conn.cursor() as cursor:
            if pedido_existente_id:
                cursor.execute(
                    """
                    UPDATE pedidos
                    SET
                        cliente_id = %s,
                        cliente = %s,
                        telefone = %s,
                        cpf_cnpj = %s,
                        canal = 'Site',
                        forma_pagamento = %s,
                        status_pagamento = %s,
                        quantidade = %s,
                        subtotal = %s,
                        frete = %s,
                        desconto_geral = %s,
                        valor_total = %s,
                        status = %s,
                        data_pedido = %s,
                        data_entrega = %s,
                        endereco_entrega = %s,
                        cep_entrega = %s,
                        transportadora = %s,
                        servico_entrega = %s,
                        prazo_entrega_dias = %s,
                        codigo_rastreio = %s,
                        observacao_producao = %s,
                        origem = 'SITE',
                        sincronizado = 1,
                        atualizado_em = CURRENT_TIMESTAMP
                    WHERE id = %s
                    """,
                    (
                        cliente_erp_id,
                        nome_cliente,
                        telefone,
                        documento,
                        forma_pagamento,
                        payment_status,
                        quantidade_total,
                        subtotal,
                        frete,
                        desconto,
                        total,
                        status_erp,
                        data_pedido,
                        data_entrega,
                        endereco_texto,
                        endereco_campos["cep"],
                        transportadora,
                        servico,
                        prazo,
                        rastreio,
                        observacao,
                        pedido_existente_id,
                    ),
                )
                return pedido_existente_id

            cursor.execute(
                """
                INSERT INTO pedidos (
                    site_order_id,
                    numero_site,
                    cliente_id,
                    cliente,
                    telefone,
                    cpf_cnpj,
                    canal,
                    forma_pagamento,
                    status_pagamento,
                    quantidade,
                    subtotal,
                    frete,
                    desconto_geral,
                    valor_total,
                    status,
                    data_pedido,
                    data_entrega,
                    endereco_entrega,
                    cep_entrega,
                    transportadora,
                    servico_entrega,
                    prazo_entrega_dias,
                    codigo_rastreio,
                    observacao_producao,
                    prioridade,
                    origem,
                    sincronizado,
                    atualizado_em
                )
                VALUES (
                    %s, %s, %s, %s, %s,
                    %s, 'Site', %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, 'NORMAL',
                    'SITE', 1, CURRENT_TIMESTAMP
                )
                RETURNING id
                """,
                (
                    pedido["id"],
                    numero_site,
                    cliente_erp_id,
                    nome_cliente,
                    telefone,
                    documento,
                    forma_pagamento,
                    payment_status,
                    quantidade_total,
                    subtotal,
                    frete,
                    desconto,
                    total,
                    status_erp,
                    data_pedido,
                    data_entrega,
                    endereco_texto,
                    endereco_campos["cep"],
                    transportadora,
                    servico,
                    prazo,
                    rastreio,
                    observacao,
                ),
            )

            return int(cursor.fetchone()[0])

    @staticmethod
    def _salvar_itens_erp(
        conn,
        pedido_erp_id: int,
        itens: Sequence[Dict[str, Any]],
        pedido_site: Dict[str, Any],
    ) -> None:
        quantidade_total = 0

        with conn.cursor() as cursor:
            for item in itens:
                site_item_id = item.get("id")

                produto_id = (
                    item.get("product_id")
                    or item.get("produto_id")
                )
                produto_nome = (
                    item.get("product_name")
                    or item.get("name")
                    or item.get("produto_nome")
                    or item.get("title")
                    or "Produto do site"
                )
                categoria = (
                    item.get("category")
                    or item.get("categoria")
                    or ""
                )
                sku = (
                    item.get("sku")
                    or item.get("variation_sku")
                    or item.get("variant_sku")
                    or ""
                )
                variacao_id = (
                    item.get("variation_id")
                    or item.get("variant_id")
                )
                variacao = (
                    item.get("variation_color")
                    or item.get("variant_name")
                    or item.get("variation")
                    or item.get("color")
                    or ""
                )
                quantidade = SyncSitePedidosService._numero(
                    item.get("quantity")
                    or item.get("quantidade")
                    or 1
                )
                preco = SyncSitePedidosService._numero(
                    item.get("unit_price")
                    or item.get("price")
                    or item.get("preco_unitario")
                )
                subtotal = SyncSitePedidosService._numero(
                    item.get("subtotal")
                    or item.get("total")
                    or (quantidade * preco)
                )
                imagem = (
                    item.get("image_url")
                    or item.get("image")
                    or ""
                )
                arte = (
                    item.get("artwork_url")
                    or item.get("art_url")
                    or item.get("arte_cliente")
                    or item.get("customization_file_url")
                    or pedido_site.get("artwork_url")
                    or pedido_site.get("arte_cliente")
                    or ""
                )
                observacao = (
                    item.get("notes")
                    or item.get("observation")
                    or item.get("observacao_item")
                    or ""
                )

                quantidade_total += quantidade

                if site_item_id:
                    cursor.execute(
                        """
                        INSERT INTO itens_pedido (
                            pedido_id,
                            produto_id,
                            produto_nome,
                            categoria,
                            sku,
                            variacao_id,
                            variacao,
                            quantidade,
                            preco_unitario,
                            desconto_percentual,
                            subtotal,
                            imagem_url,
                            arte_cliente,
                            observacao_item,
                            site_order_item_id,
                            atualizado_em
                        )
                        VALUES (
                            %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, 0,
                            %s, %s, %s, %s, %s,
                            CURRENT_TIMESTAMP
                        )
                        ON CONFLICT (site_order_item_id)
                        DO UPDATE SET
                            pedido_id = EXCLUDED.pedido_id,
                            produto_id = EXCLUDED.produto_id,
                            produto_nome = EXCLUDED.produto_nome,
                            categoria = EXCLUDED.categoria,
                            sku = EXCLUDED.sku,
                            variacao_id = EXCLUDED.variacao_id,
                            variacao = EXCLUDED.variacao,
                            quantidade = EXCLUDED.quantidade,
                            preco_unitario = EXCLUDED.preco_unitario,
                            subtotal = EXCLUDED.subtotal,
                            imagem_url = EXCLUDED.imagem_url,
                            arte_cliente = EXCLUDED.arte_cliente,
                            observacao_item = EXCLUDED.observacao_item,
                            atualizado_em = CURRENT_TIMESTAMP
                        """,
                        (
                            pedido_erp_id,
                            str(produto_id) if produto_id else None,
                            produto_nome,
                            categoria,
                            sku,
                            str(variacao_id) if variacao_id else None,
                            variacao,
                            quantidade,
                            preco,
                            subtotal,
                            imagem,
                            arte,
                            observacao,
                            site_item_id,
                        ),
                    )
                else:
                    # Fallback quando o site ainda não fornece ID no item.
                    cursor.execute(
                        """
                        SELECT id
                        FROM itens_pedido
                        WHERE pedido_id = %s
                          AND COALESCE(sku, '') = COALESCE(%s, '')
                          AND COALESCE(variacao, '') = COALESCE(%s, '')
                        LIMIT 1
                        """,
                        (pedido_erp_id, sku, variacao),
                    )
                    existente = cursor.fetchone()

                    if existente:
                        cursor.execute(
                            """
                            UPDATE itens_pedido
                            SET
                                produto_id = %s,
                                produto_nome = %s,
                                categoria = %s,
                                quantidade = %s,
                                preco_unitario = %s,
                                subtotal = %s,
                                imagem_url = %s,
                                arte_cliente = %s,
                                observacao_item = %s,
                                atualizado_em = CURRENT_TIMESTAMP
                            WHERE id = %s
                            """,
                            (
                                str(produto_id) if produto_id else None,
                                produto_nome,
                                categoria,
                                quantidade,
                                preco,
                                subtotal,
                                imagem,
                                arte,
                                observacao,
                                existente[0],
                            ),
                        )
                    else:
                        cursor.execute(
                            """
                            INSERT INTO itens_pedido (
                                pedido_id,
                                produto_id,
                                produto_nome,
                                categoria,
                                sku,
                                variacao_id,
                                variacao,
                                quantidade,
                                preco_unitario,
                                desconto_percentual,
                                subtotal,
                                imagem_url,
                                arte_cliente,
                                observacao_item,
                                atualizado_em
                            )
                            VALUES (
                                %s, %s, %s, %s, %s,
                                %s, %s, %s, %s, 0,
                                %s, %s, %s, %s,
                                CURRENT_TIMESTAMP
                            )
                            """,
                            (
                                pedido_erp_id,
                                str(produto_id) if produto_id else None,
                                produto_nome,
                                categoria,
                                sku,
                                str(variacao_id) if variacao_id else None,
                                variacao,
                                quantidade,
                                preco,
                                subtotal,
                                imagem,
                                arte,
                                observacao,
                            ),
                        )

            cursor.execute(
                """
                UPDATE pedidos
                SET
                    quantidade = %s,
                    atualizado_em = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (quantidade_total, pedido_erp_id),
            )

    @staticmethod
    def _garantir_ordem_producao(
        conn,
        pedido_erp_id: int,
        pedido_site: Dict[str, Any],
        pagamento: Dict[str, Any],
    ) -> None:
        status_pedido = str(
            pedido_site.get("status")
            or ""
        ).lower()
        status_pagamento = str(
            pagamento.get("status")
            or pedido_site.get("payment_status")
            or ""
        ).lower()

        aprovado = (
            status_pagamento in {"approved", "paid", "authorized"}
            or status_pedido in {"approved", "paid", "production"}
        )

        if not aprovado:
            return

        if not SyncSitePedidosService._tabela_existe(
            conn, "ordens_producao"
        ):
            return

        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT id
                FROM ordens_producao
                WHERE pedido_id = %s
                LIMIT 1
                """,
                (pedido_erp_id,),
            )

            if cursor.fetchone():
                return

            numero_op = f"OP-SITE-{pedido_erp_id}"

            cursor.execute(
                """
                INSERT INTO ordens_producao (
                    pedido_id,
                    numero_op,
                    responsavel,
                    status,
                    data_abertura
                )
                VALUES (
                    %s,
                    %s,
                    'Sistema',
                    'ABERTA',
                    CURRENT_TIMESTAMP
                )
                """,
                (
                    pedido_erp_id,
                    numero_op,
                ),
            )

    @staticmethod
    def _marcar_sincronizado(
        conn,
        site_order_id,
    ) -> None:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE orders
                SET
                    source = COALESCE(source, 'site'),
                    erp_synced = TRUE,
                    erp_synced_at = CURRENT_TIMESTAMP,
                    erp_sync_error = NULL
                WHERE id = %s
                """,
                (site_order_id,),
            )

    @staticmethod
    def _marcar_erro_seguro(
        site_order_id,
        erro: str,
    ) -> None:
        if not site_order_id:
            return

        try:
            with closing(get_connection()) as conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE orders
                        SET
                            erp_synced = FALSE,
                            erp_sync_error = %s
                        WHERE id = %s
                        """,
                        (
                            erro[:2000],
                            site_order_id,
                        ),
                    )
                conn.commit()
        except Exception:
            traceback.print_exc()

    @staticmethod
    def _montar_observacao_pedido(
        pedido: Dict[str, Any],
        endereco: Dict[str, Any],
        pagamento: Dict[str, Any],
    ) -> str:
        partes = [
            "Pedido importado automaticamente do site MugArt.",
        ]

        observacao = (
            pedido.get("notes")
            or pedido.get("observation")
            or pedido.get("customer_notes")
            or pedido.get("observacao")
        )
        if observacao:
            partes.append(f"Observação do cliente: {observacao}")

        mp_id = (
            pagamento.get("mercado_pago_payment_id")
            or pagamento.get("provider_payment_id")
            or pagamento.get("payment_id")
        )
        if mp_id:
            partes.append(f"Pagamento Mercado Pago: {mp_id}")

        return "\n".join(partes)

    @staticmethod
    def _endereco_para_campos(
        endereco: Dict[str, Any],
    ) -> Dict[str, str]:
        return {
            "cep": str(
                SyncSitePedidosService._primeiro(
                    endereco,
                    "postal_code",
                    "zip_code",
                    "cep",
                    default="",
                )
            ),
            "rua": str(
                SyncSitePedidosService._primeiro(
                    endereco,
                    "street",
                    "address",
                    "endereco",
                    "rua",
                    default="",
                )
            ),
            "numero": str(
                SyncSitePedidosService._primeiro(
                    endereco,
                    "number",
                    "numero",
                    default="",
                )
            ),
            "complemento": str(
                SyncSitePedidosService._primeiro(
                    endereco,
                    "complement",
                    "complemento",
                    default="",
                )
            ),
            "bairro": str(
                SyncSitePedidosService._primeiro(
                    endereco,
                    "neighborhood",
                    "bairro",
                    default="",
                )
            ),
            "cidade": str(
                SyncSitePedidosService._primeiro(
                    endereco,
                    "city",
                    "cidade",
                    default="",
                )
            ),
            "estado": str(
                SyncSitePedidosService._primeiro(
                    endereco,
                    "state",
                    "uf",
                    "estado",
                    default="",
                )
            ),
        }

    @staticmethod
    def _primeiro(
        dados: Dict[str, Any],
        *chaves: str,
        default=None,
    ):
        for chave in chaves:
            valor = dados.get(chave)

            if valor not in (None, ""):
                return valor

        return default

    @staticmethod
    def _numero(valor) -> float:
        if valor in (None, ""):
            return 0.0

        if isinstance(valor, Decimal):
            return float(valor)

        if isinstance(valor, (int, float)):
            return float(valor)

        texto = str(valor).strip().replace("R$", "").replace(" ", "")

        if "," in texto:
            texto = texto.replace(".", "").replace(",", ".")

        try:
            return float(texto)
        except (TypeError, ValueError):
            return 0.0

    @staticmethod
    def _inteiro(valor) -> Optional[int]:
        if valor in (None, ""):
            return None

        try:
            return int(float(valor))
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _somente_numeros(valor) -> str:
        return "".join(
            caractere
            for caractere in str(valor or "")
            if caractere.isdigit()
        )

    @staticmethod
    def _tabela_existe(
        conn,
        tabela: str,
    ) -> bool:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                      AND table_name = %s
                )
                """,
                (tabela,),
            )
            return bool(cursor.fetchone()[0])

    @staticmethod
    def _colunas_tabela(
        conn,
        tabela: str,
    ) -> List[str]:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = %s
                ORDER BY ordinal_position
                """,
                (tabela,),
            )
            return [row[0] for row in cursor.fetchall()]

    @staticmethod
    def _adicionar_coluna(
        cursor,
        tabela: str,
        coluna: str,
        tipo: str,
    ) -> None:
        cursor.execute(
            """
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = %s
              AND column_name = %s
            """,
            (tabela, coluna),
        )

        if cursor.fetchone():
            return

        cursor.execute(
            f'ALTER TABLE "{tabela}" ADD COLUMN "{coluna}" {tipo}'
        )


if __name__ == "__main__":
    print(SyncSitePedidosService.sincronizar())
