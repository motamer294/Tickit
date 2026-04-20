from django.contrib import admin

from .models import Ticket, Comment, TicketHistory, Category, Tag


# ==========================================
# Category Admin
# ==========================================
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'color', 'created_at')
    search_fields = ('name',)
    readonly_fields = ('created_at',)


# ==========================================
# Tag Admin
# ==========================================
class TagAdmin(admin.ModelAdmin):
    list_display = ('name', 'color', 'created_at')
    search_fields = ('name',)
    readonly_fields = ('created_at',)


# ==========================================
# Ticket Admin
# ==========================================
class CommentInline(admin.TabularInline):
    model = Comment
    extra = 1


class TicketHistoryInline(admin.TabularInline):
    model = TicketHistory
    extra = 0
    readonly_fields = ('changed_by', 'old_status', 'new_status', 'changed_at')
    can_delete = False


class TicketAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'status', 'priority', 'category', 'created_by', 'assigned_to', 'created_at')
    list_filter = ('status', 'priority', 'category', 'created_at')
    search_fields = ('title', 'description', 'id')
    filter_horizontal = ('tags',)  # Nice UI for M2M tags
    inlines = [CommentInline, TicketHistoryInline]


# ==========================================
# Register Models
# ==========================================
admin.site.register(Category, CategoryAdmin)
admin.site.register(Tag, TagAdmin)
admin.site.register(Ticket, TicketAdmin)
admin.site.register(Comment)
admin.site.register(TicketHistory)
