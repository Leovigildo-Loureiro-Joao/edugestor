import { jsonLoader } from './jsonLoader';
import { CourseFormData } from '../../types/curso';

export const mockCursosService = {
  async create(course: CourseFormData) {
    await new Promise(resolve => setTimeout(resolve, 600));
    console.log('📝 Mock create course:', course);
    
    // Simula a criação com ID novo
    const newCourse = {
      ...course,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      alunos: [],
      turmas: []
    };
    
    return [newCourse];
  },

  async getCourse() {
    await new Promise(resolve => setTimeout(resolve, 400));
    const cursos = await jsonLoader.getCursos();
    
    // Garante que cada curso tem alunos e turmas (pode estar vazio)
    return cursos.map(curso => ({
      ...curso,
      alunos: curso.alunos || [],
      turmas: curso.turmas || []
    }));
  },

  async getCourseId(id: string) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const cursos = await jsonLoader.getCursos();
    const curso = cursos.find(c => c.id === id);
    
    if (!curso) return null;
    
    // Garante que retorna com a estrutura completa
    return {
      ...curso,
      alunos: curso.alunos || [],
      turmas: curso.turmas || []
    };
  },

  async updateCourse(id: string, courseData: CourseFormData) {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('📝 Mock update course:', id, courseData);
    return { success: true };
  },

  async deleteCourse(id: string) {
    await new Promise(resolve => setTimeout(resolve, 400));
    console.log('🗑️ Mock delete course:', id);
    return { success: true };
  },

  async getCursosAtivos() {
    await new Promise(resolve => setTimeout(resolve, 300));
    const cursos = await jsonLoader.getCursos();
    return cursos.filter(curso => curso.ativo === true);
  }
};