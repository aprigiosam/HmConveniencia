from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
    verbose_name = 'HMConveniencia Core'

    def ready(self):
        """Importa signals quando o app estiver pronto"""
        import core.signals  # noqa
