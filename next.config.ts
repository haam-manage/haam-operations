import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/glossary', destination: 'https://glossary-8sh.pages.dev/glossary', permanent: false },
      { source: '/privacy-terms', destination: 'https://haam-terms.haam-manage.workers.dev/privacy', permanent: false },
      { source: '/terms', destination: 'https://haam-terms.haam-manage.workers.dev', permanent: false },
      { source: '/terms-compare', destination: 'https://docs.google.com/document/d/144WNQCl8oMSVR3EJCbRlh0hNTgLnbc4th0FRRf_KmbQ/edit?usp=sharing', permanent: false },
      { source: '/haam-couser', destination: 'https://haam-invite.haam-manage.workers.dev', permanent: false },
      { source: '/haam-map', destination: 'https://sites.google.com/view/haam-map', permanent: false },
    ];
  },
};

export default nextConfig;
