import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  en: {
    translation: {
      "common.welcome": "Welcome to b4skills",
      "common.start_test": "Start Assessment",
      "common.results": "Your Results",
      "common.loading": "Loading...",
      "admin.dashboard": "Admin Dashboard",
      "admin.candidates": "Candidates",
      "admin.analytics": "Analytics",
      "admin.settings": "Settings",
      "test.next": "Next Task",
      "test.submit": "Submit Response",
      "test.time_left": "Time Left"
    }
  },
  es: {
    translation: {
      "common.welcome": "Bienvenido a b4skills",
      "common.start_test": "Iniciar Evaluación",
      "common.results": "Tus Resultados",
      "common.loading": "Cargando...",
      "admin.dashboard": "Panel de Administración",
      "admin.candidates": "Candidatos",
      "admin.analytics": "Analítica",
      "admin.settings": "Configuración",
      "test.next": "Siguiente Tarea",
      "test.submit": "Enviar Respuesta",
      "test.time_left": "Tiempo Restante"
    }
  },
  fr: {
    translation: {
      "common.welcome": "Bienvenue sur b4skills",
      "common.start_test": "Commencer l'évaluation",
      "common.results": "Vos résultats",
      "common.loading": "Chargement...",
      "admin.dashboard": "Tableau de bord",
      "admin.candidates": "Candidats",
      "admin.analytics": "Analytique",
      "admin.settings": "Paramètres",
      "test.next": "Tâche suivante",
      "test.submit": "Soumettre la réponse",
      "test.time_left": "Temps restant"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
