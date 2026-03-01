from django.contrib import admin

from .models import Ticket, Comment, TicketHistory


class CommentInline(admin.TabularInline):
    model = Comment
    extra = 1


class TicketHistoryInline(admin.TabularInline):
    model = TicketHistory
    extra = 0
    readonly_fields = ('changed_by', 'old_status', 'new_status', 'changed_at')
    can_delete = False


class TicketAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'status', 'created_by', 'assigned_to', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('title', 'description', 'id')
    inlines = [CommentInline, TicketHistoryInline]


admin.site.register(Ticket, TicketAdmin)
admin.site.register(Comment)
admin.site.register(TicketHistory)