export const statsService = {
  // ✅ Calcular métricas avançadas
  calculateMetrics(rawData) {
    const { totalStudents, activeStudents, totalClasses } = rawData;
    
    return {
      attendanceRate: totalStudents > 0 ? (activeStudents / totalStudents) * 100 : 0,
      studentsPerClass: totalClasses > 0 ? (totalStudents / totalClasses) : 0,
      inactivityRate: totalStudents > 0 ? ((totalStudents - activeStudents) / totalStudents) * 100 : 0
    };
  },

  // ✅ Gerar tendências
  generateTrends(currentData, previousData) {
    return {
      studentGrowth: previousData.totalStudents > 0 
        ? ((currentData.totalStudents - previousData.totalStudents) / previousData.totalStudents) * 100 
        : 100,
      classGrowth: previousData.totalClasses > 0 
        ? ((currentData.totalClasses - previousData.totalClasses) / previousData.totalClasses) * 100 
        : 100
    };
  }
};

