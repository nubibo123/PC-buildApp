import { Cloudinary } from '@cloudinary/url-gen';

export const cloudinary = new Cloudinary({
  cloud: {
    cloudName: 'drggczuln'
  },
  url: {
    secure: true
  }
});

export const CLOUDINARY_UPLOAD_PRESET = 'PCRecc';
export const CLOUDINARY_CLOUD_NAME = 'drggczuln';