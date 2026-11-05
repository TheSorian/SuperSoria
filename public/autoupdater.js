/**
 * SuperSoria AutoUpdater & Cloud Sync
 * Sincronización automática de precios y detector de nuevas versiones de la app (APK)
 */

const GITHUB_REPO = 'TheSorian/SuperSoria';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/TheSorian/SuperSoria/master';
const CURRENT_APP_VERSION = '1.2.3';

/**
 * Compara dos versiones semver (p. ej. "1.2.0" y "1.1.0")
 * Devuelve true si remote > local
 */
function isNewerSemver(remoteStr, localStr) {
  const parse = (v) => {
    if (!v) return [0, 0, 0];
    const clean = v.toString().replace(/^v/i, '').trim();
    const parts = clean.split('.').map(n => parseInt(n, 10) || 0);
    while (parts.length < 3) parts.push(0);
    return parts;
  };

  const [rMaj, rMin, rPat] = parse(remoteStr);
  const [lMaj, lMin, lPat] = parse(localStr);

  if (rMaj > lMaj) return true;
  if (rMaj < lMaj) return false;
  if (rMin > lMin) return true;
  if (rMin < lMin) return false;
  return rPat > lPat;
}

class SuperSoriaCloudSync {
  constructor() {
    this.storageKey = 'supersoria_sync_info';
  }

  getInfo() {
    let stored = {};
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) stored = JSON.parse(raw);
    } catch {}
    return {
      version: CURRENT_APP_VERSION,
      lastSync: stored.lastSync || new Date().toISOString(),
      productsCount: stored.productsCount || 47098,
      pricesCount: stored.pricesCount || 81830,
      sha256: stored.sha256 || null,
    };
  }

  saveInfo(info) {
    localStorage.setItem(this.storageKey, JSON.stringify(info));
  }

  /**
   * Comprueba si hay una versión nueva de precios en GitHub Actions
   */
  async checkForUpdates() {
    try {
      const url = `${GITHUB_RAW_BASE}/dist-release/metadata.json?t=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`GitHub HTTP ${res.status}`);
      }

      const remoteMeta = await res.json();
      const current = this.getInfo();

      const hasUpdate =
        !current.sha256 ||
        (remoteMeta.sha256 && remoteMeta.sha256 !== current.sha256) ||
        new Date(remoteMeta.generatedAt).getTime() > new Date(current.lastSync).getTime();

      return {
        success: true,
        hasUpdate,
        current,
        remoteMeta,
      };
    } catch (err) {
      console.warn('No se pudo verificar actualización de precios en GitHub:', err.message);
      return {
        success: false,
        error: err.message,
        current: this.getInfo(),
      };
    }
  }

  /**
   * Ejecuta la sincronización descargando el paquete de la nube
   */
  async syncNow(onProgress) {
    if (window.superSoriaClientDB) {
      await window.superSoriaClientDB.syncFromCloud(onProgress);
    }

    const check = await this.checkForUpdates();
    const meta = check.remoteMeta || {
      generatedAt: new Date().toISOString(),
      stats: { totalProducts: 47098, totalPriceRecords: 81830 },
      sha256: 'latest',
    };

    // Actualizar registro local
    const newInfo = {
      version: CURRENT_APP_VERSION,
      lastSync: meta.generatedAt,
      productsCount: meta.stats?.totalProducts || 47098,
      pricesCount: meta.stats?.totalPriceRecords || 81830,
      sha256: meta.sha256,
    };
    this.saveInfo(newInfo);

    if (onProgress) onProgress('¡Precios actualizados!', 100);
    return newInfo;
  }

  /**
   * Comprueba si hay una nueva versión del binario de la aplicación (APK) en GitHub Releases
   */
  async checkAppBinaryUpdate() {
    try {
      const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
      const res = await fetch(apiUrl, {
        headers: { Accept: 'application/vnd.github.v3+json' },
        cache: 'no-store'
      });

      if (!res.ok) {
        throw new Error(`GitHub HTTP ${res.status}`);
      }

      const release = await res.json();
      const latestTag = release.tag_name || '';
      const hasUpdate = isNewerSemver(latestTag, CURRENT_APP_VERSION);

      // Buscar asset del APK
      const apkAsset = release.assets?.find(a => a.name && a.name.endsWith('.apk'));
      const downloadUrl = apkAsset?.browser_download_url || 
        `https://github.com/${GITHUB_REPO}/releases/latest/download/SuperSoria.apk`;
      
      const apkSizeMb = apkAsset ? (apkAsset.size / (1024 * 1024)).toFixed(1) : null;

      return {
        success: true,
        hasUpdate,
        currentVersion: `v${CURRENT_APP_VERSION}`,
        latestVersion: latestTag.startsWith('v') ? latestTag : `v${latestTag}`,
        downloadUrl,
        apkSizeMb,
        releaseNotes: release.body || '',
        publishedAt: release.published_at,
        htmlUrl: release.html_url,
      };
    } catch (err) {
      console.warn('No se pudo comprobar actualización del APK:', err.message);
      return {
        success: false,
        error: err.message,
        currentVersion: `v${CURRENT_APP_VERSION}`,
        hasUpdate: false,
      };
    }
  }
}

// Instancia global
window.superSoriaSync = new SuperSoriaCloudSync();

/**
 * Inicializador del banner de actualización automática
 */
window.checkAppUpdateOnLaunch = async function() {
  try {
    const res = await window.superSoriaSync.checkAppBinaryUpdate();
    if (!res.success || !res.hasUpdate) return;

    // Comprobar si el usuario ya descartó esta versión en la sesión actual
    const dismissed = sessionStorage.getItem('dismissed_update_version');
    if (dismissed === res.latestVersion) return;

    // Mostrar banner superior
    const banner = document.getElementById('app-update-banner');
    const versionTag = document.getElementById('app-update-version-tag');
    const downloadBtn = document.getElementById('app-update-download-btn');

    if (banner && versionTag && downloadBtn) {
      versionTag.innerText = res.latestVersion;
      downloadBtn.href = res.downloadUrl;
      downloadBtn.onclick = (e) => {
        // En móviles Android se abre la descarga del APK directamente
        window.open(res.downloadUrl, '_system');
      };
      banner.classList.remove('hidden');
    }
  } catch (e) {
    console.debug('Error comprobando APK silenciosamente:', e);
  }
};

window.dismissAppUpdateBanner = function() {
  const banner = document.getElementById('app-update-banner');
  const versionTag = document.getElementById('app-update-version-tag');
  if (banner) banner.classList.add('hidden');
  if (versionTag?.innerText) {
    sessionStorage.setItem('dismissed_update_version', versionTag.innerText.trim());
  }
};
