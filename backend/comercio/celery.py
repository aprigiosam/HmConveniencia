import os

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'comercio.settings')

app = Celery('comercio')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()


@app.task(bind=True)
def debug_task(self):
    """Simple debug helper task."""
    self.logger.info('Running debug task %s', self.request.id)
