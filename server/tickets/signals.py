from django.db.models.signals import pre_save
from django.dispatch import receiver
# أضف السطر التالي لاستيراد الموديلات
from .models import Ticket, TicketHistory 

#@receiver(pre_save, sender=Ticket)
#def track_ticket_status_change(sender, instance, **kwargs):
    # نتحقق إذا كانت التذكرة موجودة مسبقاً (تحديث وليس إنشاء جديد)
 #   if instance.id: 
  #      try:
   #         old_ticket = Ticket.objects.get(id=instance.id)
    #        if old_ticket.status != instance.status:
                # إنشاء سجل في الـ History تلقائياً عند تغير الحالة
     #           TicketHistory.objects.create(
      #              ticket=instance,
       #             old_status=old_ticket.status,
        #            new_status=instance.status
         #       )
        #except Ticket.DoesNotExist:
         #   pass