// src/services/database/students.js
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  query,
  where,
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Referência da coleção
const studentsRef = collection(db, 'alunos');

// CRUD Operations
export const studentsService = {
  // Criar aluno
  async createStudent(studentData) {
    try {
      const docRef = await addDoc(studentsRef, {
        ...studentData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      throw new Error(`Erro ao criar aluno: ${error.message}`);
    }
  },

  // Buscar todos os alunos
  async getStudents() {
    try {
      const querySnapshot = await getDocs(
        query(studentsRef, orderBy('created_at', 'desc'))
      );
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      throw new Error(`Erro ao buscar alunos: ${error.message}`);
    }
  },

  // Buscar aluno por ID
  async getStudentById(id) {
    try {
      const docRef = doc(db, 'alunos', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error('Aluno não encontrado');
      }
    } catch (error) {
      throw new Error(`Erro ao buscar aluno: ${error.message}`);
    }
  },

  // Atualizar aluno
  async updateStudent(id, studentData) {
    try {
      const docRef = doc(db, 'alunos', id);
      await updateDoc(docRef, {
        ...studentData,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      throw new Error(`Erro ao atualizar aluno: ${error.message}`);
    }
  },

  // Deletar aluno
  async deleteStudent(id) {
    try {
      const docRef = doc(db, 'alunos', id);
      await deleteDoc(docRef);
    } catch (error) {
      throw new Error(`Erro ao deletar aluno: ${error.message}`);
    }
  },

  // Buscar alunos por turma
  async getStudentsByClass(turmaId) {
    try {
      const q = query(studentsRef, where('turma_id', '==', turmaId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      throw new Error(`Erro ao buscar alunos por turma: ${error.message}`);
    }
  }
};