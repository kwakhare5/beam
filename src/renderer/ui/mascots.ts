import masterMark from '../../../assets/mascot/beam-mascot.svg';
import mascotFiles from '../../../assets/mascot/star-files.svg';
import mascotMusic from '../../../assets/mascot/star-music.svg';

export type MascotName = 'master' | 'music' | 'files';

export const MASCOTS: Record<MascotName, string> = {
  master: masterMark,
  music: mascotMusic,
  files: mascotFiles
};
