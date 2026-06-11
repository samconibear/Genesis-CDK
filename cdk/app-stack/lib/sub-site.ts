import { BaseSite, BaseSiteProps } from './base-site';

export interface SubSiteProps {
  domain: string,
  src: string,
  bucketNameParameterName?: string,
}

