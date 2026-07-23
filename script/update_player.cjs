const fs = require('fs');
let lines = fs.readFileSync('client/src/components/PlayerController.tsx', 'utf-8').split('\n');
const before = lines.slice(0, 25).join('\n');
const after = lines.slice(275).join('\n');
const imports = `import {
  PLAYER_START_POSITION, MAX_SPEED, WALK_TARGET_SPEED, TURN_SPEED, BRAKE_FORCE,
  BOOST_SPEED_MULTIPLIER, WALK2RUN_DURATION_MS, WALK2RUN_ENTER_FADE, WALK2RUN_LEAN_ANGLE,
  WALK2RUN_LEAN_SMOOTH_SPEED, WALK_LEAN_ANGLE, WALK_LEAN_SMOOTH_SPEED, PLAYER_START_ROTATION_Y,
  CAM_OFFSET, CAM_OFFSET_RUN, CAM_LOOK_OFFSET, CAM_OFFSET_REFERENCE_FOV, FIRST_PERSON_HEIGHT_DEFAULT,
  FIRST_PERSON_FORWARD, FIRST_PERSON_LOOK_DISTANCE, MOUSE_LOOK_SENSITIVITY, MOUSE_LOOK_YAW_LIMIT,
  MOUSE_LOOK_PITCH_LIMIT, TP_FOV_WALK, TP_FOV_RUN, FP_FOV_RUN_START_SPEED, FP_FOV_RUN_MAX_SPEED,
  FP_FOV_IDLE, FP_FOV_RUN, JUMP_CAMERA_BOB_DURATION, NETWORK_STATE_INTERVAL, START_LANE_SPACING,
  jumpCameraBobOffset
} from './player/constants';
import { HorseHeadTilt } from './player/HorseHeadTilt';`;

fs.writeFileSync('client/src/components/PlayerController.tsx', before + '\n' + imports + '\n' + after);
console.log("Updated PlayerController.tsx");
