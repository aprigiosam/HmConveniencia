"""
Comando para testar e gerenciar cache (Redis ou LocMem)
"""

from django.core.management.base import BaseCommand
from django.core.cache import cache
from django.conf import settings
import time


class Command(BaseCommand):
    help = "Testa conexão e operações do cache (Redis ou LocMem)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Limpa todo o cache",
        )
        parser.add_argument(
            "--stats",
            action="store_true",
            help="Mostra estatísticas do cache",
        )

    def handle(self, *args, **options):
        # Identifica o backend
        cache_backend = settings.CACHES["default"]["BACKEND"]
        cache_location = settings.CACHES["default"].get("LOCATION", "N/A")

        if "redis" in cache_backend.lower():
            cache_type = "Redis"
        elif "locmem" in cache_backend.lower():
            cache_type = "LocMem (Memória Local)"
        elif "db" in cache_backend.lower():
            cache_type = "Database Cache"
        else:
            cache_type = "Unknown"

        self.stdout.write(self.style.HTTP_INFO("=" * 60))
        self.stdout.write(self.style.HTTP_INFO("INFORMAÇÕES DO CACHE"))
        self.stdout.write(self.style.HTTP_INFO("=" * 60))
        self.stdout.write(f"Backend: {self.style.SUCCESS(cache_type)}")
        self.stdout.write(f"Location: {cache_location}")
        self.stdout.write("")

        # Opção: Limpar cache
        if options["clear"]:
            self.stdout.write(self.style.WARNING("Limpando todo o cache..."))
            try:
                cache.clear()
                self.stdout.write(self.style.SUCCESS("✓ Cache limpo com sucesso!"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"✗ Erro ao limpar cache: {e}"))
            return

        # Opção: Estatísticas (apenas para Redis)
        if options["stats"]:
            if cache_type == "Redis":
                try:
                    from django_redis import get_redis_connection

                    redis_conn = get_redis_connection("default")
                    info = redis_conn.info()

                    self.stdout.write(self.style.HTTP_INFO("ESTATÍSTICAS DO REDIS"))
                    self.stdout.write(self.style.HTTP_INFO("=" * 60))
                    self.stdout.write(f'Versão: {info.get("redis_version")}')
                    self.stdout.write(f'Uptime (dias): {info.get("uptime_in_days")}')
                    self.stdout.write(f'Conexões: {info.get("connected_clients")}')
                    self.stdout.write(f'Memória usada: {info.get("used_memory_human")}')
                    self.stdout.write(f"Total de chaves: {redis_conn.dbsize()}")
                    self.stdout.write(
                        f'Total de comandos: {info.get("total_commands_processed")}'
                    )
                    self.stdout.write(self.style.SUCCESS("✓ Estatísticas recuperadas!"))
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f"✗ Erro ao obter estatísticas: {e}")
                    )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"Estatísticas não disponíveis para {cache_type}"
                    )
                )
            return

        # Teste padrão: Performance e funcionalidade
        self.stdout.write(self.style.HTTP_INFO("TESTES DE FUNCIONALIDADE"))
        self.stdout.write(self.style.HTTP_INFO("=" * 60))

        # Teste 1: SET e GET simples
        self.stdout.write("1. Testando SET/GET básico...")
        try:
            start = time.time()
            cache.set("test_key", "test_value", 60)
            value = cache.get("test_key")
            elapsed = (time.time() - start) * 1000  # ms

            if value == "test_value":
                self.stdout.write(
                    self.style.SUCCESS(f"   ✓ SET/GET funcionando ({elapsed:.2f}ms)")
                )
            else:
                self.stdout.write(self.style.ERROR("   ✗ Valor recuperado incorreto"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"   ✗ Erro: {e}"))

        # Teste 2: DELETE
        self.stdout.write("2. Testando DELETE...")
        try:
            cache.set("test_delete", "value", 60)
            cache.delete("test_delete")
            value = cache.get("test_delete")

            if value is None:
                self.stdout.write(self.style.SUCCESS("   ✓ DELETE funcionando"))
            else:
                self.stdout.write(self.style.ERROR("   ✗ DELETE falhou"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"   ✗ Erro: {e}"))

        # Teste 3: Performance (100 operações)
        self.stdout.write("3. Testando performance (100 operações SET/GET)...")
        try:
            start = time.time()
            for i in range(100):
                cache.set(f"perf_test_{i}", f"value_{i}", 60)
                cache.get(f"perf_test_{i}")
            elapsed = (time.time() - start) * 1000  # ms

            self.stdout.write(
                self.style.SUCCESS(
                    f"   ✓ 100 operações em {elapsed:.2f}ms ({elapsed/100:.2f}ms/op)"
                )
            )

            # Limpa as chaves de teste
            for i in range(100):
                cache.delete(f"perf_test_{i}")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"   ✗ Erro: {e}"))

        # Teste 4: Timeout
        self.stdout.write("4. Testando timeout de chaves...")
        try:
            cache.set("test_timeout", "value", 1)  # 1 segundo
            time.sleep(2)
            value = cache.get("test_timeout")

            if value is None:
                self.stdout.write(self.style.SUCCESS("   ✓ Timeout funcionando"))
            else:
                self.stdout.write(self.style.ERROR("   ✗ Chave não expirou"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"   ✗ Erro: {e}"))

        # Teste 5: Múltiplas chaves
        self.stdout.write("5. Testando get_many/set_many...")
        try:
            data = {f"multi_{i}": f"value_{i}" for i in range(10)}
            cache.set_many(data, 60)
            result = cache.get_many(data.keys())

            if len(result) == 10:
                self.stdout.write(
                    self.style.SUCCESS("   ✓ get_many/set_many funcionando")
                )
            else:
                self.stdout.write(
                    self.style.ERROR(f"   ✗ Esperado 10 chaves, obteve {len(result)}")
                )

            # Limpa
            cache.delete_many(data.keys())
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"   ✗ Erro: {e}"))

        self.stdout.write("")
        self.stdout.write(self.style.HTTP_INFO("=" * 60))
        self.stdout.write(self.style.SUCCESS("✓ Testes concluídos!"))
        self.stdout.write(self.style.HTTP_INFO("=" * 60))
