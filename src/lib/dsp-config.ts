/**
 * DSP configuration defaults.
 * Single source of truth — all services and stores reference these.
 */

export const DSP_DEFAULTS = {
  xandr: {
    memberId: 14843,
    advertiserId: 7392214,
  },
  dv360: {
    advertiserId: '1426474713',
    serviceAccount: 'dsp-creative-bulk@site-hypr.iam.gserviceaccount.com',
  },
  amazondsp: {
    advertiserId: '4968167560201',
    entityId: 'ENTITY1AU67WNJQTDCK',
    defaultMarketplace: 'BR',
  },
} as const;
