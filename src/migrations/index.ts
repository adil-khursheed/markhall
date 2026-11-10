import * as migration_20261109_111026_initial_phase1 from './20261109_111026_initial_phase1';
import * as migration_20261109_155220_phase2_ingestion from './20261109_155220_phase2_ingestion';
import * as migration_20261110_120000_phase3_retrieval from './20261110_120000_phase3_retrieval';

export const migrations = [
  {
    up: migration_20261109_111026_initial_phase1.up,
    down: migration_20261109_111026_initial_phase1.down,
    name: '20261109_111026_initial_phase1',
  },
  {
    up: migration_20261109_155220_phase2_ingestion.up,
    down: migration_20261109_155220_phase2_ingestion.down,
    name: '20261109_155220_phase2_ingestion'
  },
  {
    up: migration_20261110_120000_phase3_retrieval.up,
    down: migration_20261110_120000_phase3_retrieval.down,
    name: '20261110_120000_phase3_retrieval'
  },
];
