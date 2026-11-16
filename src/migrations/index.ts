import * as migration_20261109_111026_initial_phase1 from './20261109_111026_initial_phase1';
import * as migration_20261109_155220_phase2_ingestion from './20261109_155220_phase2_ingestion';
import * as migration_20261110_120000_phase3_retrieval from './20261110_120000_phase3_retrieval';
import * as migration_20261112_090000_phase7_uploads from './20261112_090000_phase7_uploads';
import * as migration_20261115_090000_phase9_mock from './20261115_090000_phase9_mock';
import * as migration_20261116_090000_phase11_ops from './20261116_090000_phase11_ops';

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
  {
    up: migration_20261112_090000_phase7_uploads.up,
    down: migration_20261112_090000_phase7_uploads.down,
    name: '20261112_090000_phase7_uploads'
  },
  {
    up: migration_20261115_090000_phase9_mock.up,
    down: migration_20261115_090000_phase9_mock.down,
    name: '20261115_090000_phase9_mock'
  },
  {
    up: migration_20261116_090000_phase11_ops.up,
    down: migration_20261116_090000_phase11_ops.down,
    name: '20261116_090000_phase11_ops'
  },
];
