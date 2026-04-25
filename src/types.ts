export type Screen = 
  | 'landing'
  | 'auth'
  | 'naming'
  | 'sanctuary'
  | 'pre_session'
  | 'breathing'
  | 'closing';

export interface AppState {
  currentScreen: Screen;
  userName?: string;
  groveName?: string;
  sessionDuration: number;
}