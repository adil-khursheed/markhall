import * as migration_20261109_111026_initial_phase1 from './20261109_111026_initial_phase1';

export const migrations = [
  {
    up: migration_20261109_111026_initial_phase1.up,
    down: migration_20261109_111026_initial_phase1.down,
    name: '20261109_111026_initial_phase1'
  },
];
