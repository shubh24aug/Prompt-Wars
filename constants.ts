export const GRAVITY = 0.5;
export const JUMP_FORCE = -11.0;
export const MOVE_SPEED = 4.2;
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 320; // Reduced for better viewport fit
export const GROUND_Y = 280; // Adjusted for new height
export const PLAYER_SIZE = { x: 28, y: 40 }; // Slightly smaller profile

// Collision padding (makes game more forgiving)
export const HITBOX_MARGIN = 4; 

export const ASSETS = {
  MARIO: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mario&backgroundColor=b6e3f4',
  CAR: 'https://api.dicebear.com/7.x/shapes/svg?seed=Car&backgroundColor=ff5f5f',
  OFFICE: 'https://api.dicebear.com/7.x/shapes/svg?seed=Office&backgroundColor=777'
};