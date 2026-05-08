from .models import Brinquedo

class BrinquedoService:
    """
    Camada de serviço para isolar a lógica de negócio e acesso a dados
    do modelo Brinquedo.
    """
    @staticmethod
    def list_all():
        """Retorna um queryset com todos os brinquedos."""
        return Brinquedo.objects.all()