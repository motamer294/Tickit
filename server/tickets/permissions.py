from ninja.errors import HttpError

def is_manager(request):
    if request.auth.role != "MANAGER":
        raise HttpError(403, "عذراً، هذه الصلاحية للمديرين فقط")
    return True

def is_employee(request):
    if request.auth.role not in ["MANAGER", "EMPLOYEE"]:
        raise HttpError(403, "يجب أن تكون موظفاً لتنفيذ هذا الإجراء")
    return True