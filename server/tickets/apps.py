from django.apps import AppConfig

class TicketsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'tickets'

   # def ready(self):
        # هذا السطر هو الذي يربط الـ signals عند تشغيل السيرفر
    #    import tickets.signals