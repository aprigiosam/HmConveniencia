"""
Script standalone para backup do banco PostgreSQL do Render
Não precisa de Django instalado localmente
"""
import subprocess
import sys
from datetime import datetime

# URL de conexão do Render (COLOQUE AQUI A DATABASE_URL DO RENDER)
# Formato: postgres://user:password@host:port/database
DATABASE_URL = "COLE_AQUI_A_DATABASE_URL_DO_RENDER"

def fazer_backup():
    if DATABASE_URL == "COLE_AQUI_A_DATABASE_URL_DO_RENDER":
        print("❌ ERRO: Configure a DATABASE_URL no arquivo backup_render.py")
        print("\n📝 Como obter a DATABASE_URL:")
        print("1. Acesse https://dashboard.render.com")
        print("2. Clique no banco 'hmconveniencia-db'")
        print("3. Copie a 'Internal Database URL' ou 'External Database URL'")
        print("4. Cole no arquivo backup_render.py na variável DATABASE_URL")
        sys.exit(1)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = f'backups/render_backup_{timestamp}.sql'

    print(f"🔄 Iniciando backup do Render...")
    print(f"📁 Arquivo: {backup_file}")

    try:
        # Usando pg_dump via subprocess
        cmd = f'pg_dump "{DATABASE_URL}" -Fc -f {backup_file}'
        subprocess.run(cmd, shell=True, check=True)

        print(f"✅ Backup concluído com sucesso!")
        print(f"📊 Arquivo salvo: {backup_file}")

    except FileNotFoundError:
        print("\n❌ ERRO: pg_dump não encontrado!")
        print("\n📝 Para instalar no Ubuntu/Debian:")
        print("   sudo apt-get install postgresql-client")
        print("\n📝 Para instalar no macOS:")
        print("   brew install postgresql")
        sys.exit(1)

    except subprocess.CalledProcessError as e:
        print(f"\n❌ ERRO ao fazer backup: {e}")
        sys.exit(1)

if __name__ == '__main__':
    hacer_backup()
