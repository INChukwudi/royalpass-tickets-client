export interface GameOption { id:string|null;text:string;position:number;isCorrect:boolean; }
export interface GameQuestion { id:string|null;prompt:string;position:number;timeLimitSeconds:number;points:number;options:GameOption[]; }
export interface Game { id:string;eventId:string;eventTitle:string;title:string;description:string|null;leaderboardEveryQuestions:number;isArchived:boolean;sessionCount:number;questions:GameQuestion[]; }
export interface SaveGame { eventId:string;title:string;description:string|null;leaderboardEveryQuestions:number;questions:GameQuestion[]; }
export interface LeaderboardRow { rank:number;seatLabel:string;score:number; }
export interface HostQuestion extends GameQuestion { answerCounts:Record<string,number>; }
export interface HostGameState { sessionId:string;pin:string;status:'Lobby'|'Question'|'Results'|'Leaderboard'|'Completed';gameTitle:string;eventTitle:string;currentQuestionIndex:number;totalQuestions:number;questionClosesAt:string|null;joiningLocked:boolean;leaderboardDue:boolean;joinedSeats:string[];question:HostQuestion|null;leaderboard:LeaderboardRow[]; }
export interface GameSeat { seatId:string;label:string;occupied:boolean; }
export interface GameLobby { gameTitle:string;eventTitle:string;status:string;joiningLocked:boolean;seats:GameSeat[]; }
export interface ParticipantQuestion { id:string;prompt:string;position:number;totalQuestions:number;closesAt:string|null;options:GameOption[]; }
export interface ParticipantGameState { status:'Lobby'|'Question'|'Results'|'Leaderboard'|'Completed';gameTitle:string;eventTitle:string;seatLabel:string;score:number;question:ParticipantQuestion|null;selectedOptionId:string|null;wasCorrect:boolean|null;awardedPoints:number|null;correctOptionId:string|null;leaderboard:LeaderboardRow[]; }
