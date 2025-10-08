export interface SessionData {
  sessionName: string;
  date: string;
  players: string[];
  results: { [playerName: string]: number[] };
}

export interface PlayerTotal {
  name: string;
  total: number;
  sessions: number;
  lastSession: string;
}

export interface ChartDataPoint {
  date: string;
  sessionName: string;
  round: number;
  [playerName: string]: string | number;
}

export function parseCsvContent(content: string): { players: string[], results: number[][] } {
  const lines = content.trim().split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header and one data row');
  }

  const players = lines[0].split(',').map(name => name.trim());
  const results: number[][] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const values = line.split(',').map(val => {
      const parsed = parseFloat(val.trim());
      if (isNaN(parsed)) {
        throw new Error(`Invalid number "${val.trim()}" in row ${i + 1}`);
      }
      return parsed;
    });

    if (values.length !== players.length) {
      throw new Error(`Row ${i + 1} has ${values.length} values but expected ${players.length}`);
    }
    results.push(values);
  }

  return { players, results };
}

export function getSessionNameFromFilename(filename: string): string {
  return filename.replace('.csv', '');
}

// List of CSV files to load (you can update this list when you add new files)
const CSV_FILES = [
  '2025-08-13.csv',
  '2025-07-16.csv',
  '2025-07-09.csv',
  '2025-04-02.csv',
  '2024-08-16.csv',
  '2025-09-17.csv',
  '2025-10-08.csv'
];
export async function loadAllSessions(): Promise<SessionData[]> {
  const sessions: SessionData[] = [];

  for (const filename of CSV_FILES) {
    try {
      // Use relative URL that works with both custom domain and GitHub Pages
      const url = `/data/${filename}`;
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Could not fetch ${filename}: ${response.status}`);
        continue;
      }

      const content = await response.text();
      const { players, results } = parseCsvContent(content);
      const sessionName = getSessionNameFromFilename(filename);

      const sessionData: SessionData = {
        sessionName,
        date: sessionName,
        players,
        results: {}
      };

      // Each row in results represents one balance change (hand/round)
      // Transform into player-centric format where each player has an array of their balance changes
      players.forEach((player, playerIndex) => {
        sessionData.results[player] = results.map(round => round[playerIndex]);
      });

      sessions.push(sessionData);
    } catch (error) {
      console.error(`Error processing ${filename}:`, error);
    }
  }

  // Sort sessions by date
  return sessions.sort((a, b) => a.date.localeCompare(b.date));
}

export function calculatePlayerTotals(sessions: SessionData[]): PlayerTotal[] {
  const playerTotals: { [name: string]: PlayerTotal } = {};

  sessions.forEach(session => {
    Object.entries(session.results).forEach(([playerName, balanceChanges]) => {
      const sessionTotal = balanceChanges.reduce((sum, value) => sum + value, 0);

      if (!playerTotals[playerName]) {
        playerTotals[playerName] = {
          name: playerName,
          total: 0,
          sessions: 0,
          lastSession: session.date
        };
      }

      playerTotals[playerName].total += sessionTotal;
      playerTotals[playerName].sessions += 1;
      if (session.date > playerTotals[playerName].lastSession) {
        playerTotals[playerName].lastSession = session.date;
      }
    });
  });

  return Object.values(playerTotals).sort((a, b) => b.total - a.total);
}

export function generateChartData(sessions: SessionData[]): ChartDataPoint[] {
  const chartData: ChartDataPoint[] = [];
  const runningTotals: { [playerName: string]: number } = {};

  // First, collect all unique players across all sessions
  const allPlayers = new Set<string>();
  sessions.forEach(session => {
    Object.keys(session.results).forEach(playerName => {
      allPlayers.add(playerName);
    });
  });

  // Initialize all players at $0
  Array.from(allPlayers).forEach(playerName => {
    runningTotals[playerName] = 0;
  });

  // Add initial data point with everyone at $0
  if (sessions.length > 0) {
    const firstSession = sessions[0];
    const initialDataPoint: ChartDataPoint = {
      date: firstSession.date,
      sessionName: `${firstSession.sessionName} - Start`,
      round: 0,
      ...runningTotals
    };
    chartData.push(initialDataPoint);
  }

  sessions.forEach(session => {
    // Get the number of balance changes (hands/rounds) in this session
    const firstPlayer = Object.keys(session.results)[0];
    const numBalanceChanges = session.results[firstPlayer]?.length || 0;

    // Create a data point for each balance change (hand/round)
    for (let changeIndex = 0; changeIndex < numBalanceChanges; changeIndex++) {
      // Update running totals with this balance change (only for players in this session)
      Object.entries(session.results).forEach(([playerName, balanceChanges]) => {
        runningTotals[playerName] += balanceChanges[changeIndex];
      });

      // Create data point for this balance change
      const dataPoint: ChartDataPoint = {
        date: session.date,
        sessionName: session.sessionName,
        round: changeIndex + 1,
        ...runningTotals
      };

      chartData.push(dataPoint);
    }
  });

  return chartData;
} 
