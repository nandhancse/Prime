from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ProgramDayDetailView,
    ProgramDayListCreateView,
    ProgramExerciseCreateView,
    ProgramExerciseDetailView,
    WorkoutProgramViewSet,
)


router = DefaultRouter()
router.register('', WorkoutProgramViewSet, basename='program')

urlpatterns = [
    path('<int:program_id>/days/', ProgramDayListCreateView.as_view(), name='program-days'),
    path('days/<int:pk>/', ProgramDayDetailView.as_view(), name='program-day-detail'),
    path('days/<int:day_id>/exercises/', ProgramExerciseCreateView.as_view(), name='program-day-exercise-create'),
    path('day-exercises/<int:pk>/', ProgramExerciseDetailView.as_view(), name='program-exercise-detail'),
    path('', include(router.urls)),
]
