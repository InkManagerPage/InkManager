export enum Rol {
  CLIENTE = 'CLIENTE',
  ARTISTA = 'ARTISTA',
  ESTUDIO_ADMIN = 'ESTUDIO_ADMIN',
  SUPERADMIN = 'SUPERADMIN',
}

export enum GeneroCuerpo {
  MASCULINO = 'MASCULINO',
  FEMENINO = 'FEMENINO',
}

export enum TipoColor {
  COLOR = 'COLOR',
  BLACK_AND_GREY = 'BLACK_AND_GREY',
}

export enum ZonaCuerpoGeneral {
  BRAZO = 'BRAZO',
  MANO = 'MANO',
  PIERNA = 'PIERNA',
  TORSO = 'TORSO',
  CABEZA_CUELLO = 'CABEZA_CUELLO',
}

export type SubZonaBrazo = 'inner_arm' | 'outer_arm' | 'back_arm' | 'sleeve';
export type SubZonaMano = 'palm' | 'tophand' | 'fingers';
export type SubZonaPierna = 'outer_leg' | 'inner_leg';
export type SubZonaTorso = 'ribs' | 'back' | 'stomach_chest';
export type SubZonaCabezaCuello = 'back' | 'side' | 'face_neck';

export type SubZonaCuerpo =
  | SubZonaBrazo
  | SubZonaMano
  | SubZonaPierna
  | SubZonaTorso
  | SubZonaCabezaCuello;