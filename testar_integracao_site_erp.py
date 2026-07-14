"""
Executa uma sincronização manual para teste.

Na raiz do projeto:
python testar_integracao_site_erp.py
"""

from services.sync_site_pedidos_service import SyncSitePedidosService


if __name__ == "__main__":
    resultado = SyncSitePedidosService.sincronizar(limite=20)

    print("\nResultado:")
    for chave, valor in resultado.items():
        print(f"- {chave}: {valor}")
