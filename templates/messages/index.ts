import fs from 'fs';
import path from 'path';
export const defaultMessage = fs
  .readFileSync(path.resolve(__dirname, 'info-message.md'), 'utf8')

  .toString();
export const fortaMessage = fs
  .readFileSync(path.resolve(__dirname, 'info-message.md'), 'utf8')

  .toString();

export const lowEthMessage = fs
  .readFileSync(path.resolve(__dirname, 'info-message.md'), 'utf8')

  .toString();
