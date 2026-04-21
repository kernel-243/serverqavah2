/**
 * useGeolocation — hook React pour récupérer la position GPS du navigateur.
 *
 * Utilise `enableHighAccuracy: true` pour maximiser la précision.
 * Expose deux modes :
 *   1. `getPosition()` — Promise one-shot (pour le pointage)
 *   2. `capturePosition()` — met à jour l'état interne (pour les formulaires)
 *
 * Usage (one-shot, pointage) :
 *   const { getPosition, locating } = useGeolocation()
 *   const coords = await getPosition()   // { latitude, longitude }
 *
 * Usage (formulaire bureau) :
 *   const { capturePosition, coords, locating, error } = useGeolocation()
 *   <Button onClick={capturePosition}>Ma position</Button>
 *   <Input value={coords?.latitude ?? ''} />
 */

import { useState, useCallback } from 'react';

export interface GeoCoords {
  latitude: number;
  longitude: number;
  accuracy: number; // précision en mètres (info seulement)
}

interface UseGeolocationReturn {
  /** Lance une récupération one-shot et retourne les coordonnées via Promise */
  getPosition: () => Promise<GeoCoords>;
  /** Lance une récupération et stocke le résultat dans `coords` */
  capturePosition: () => void;
  /** Coordonnées capturées (null si pas encore récupérées) */
  coords: GeoCoords | null;
  /** true pendant la récupération GPS */
  locating: boolean;
  /** Message d'erreur humain-lisible, null si pas d'erreur */
  error: string | null;
  /** Remet coords et error à null */
  reset: () => void;
}

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true, // GPS matériel si disponible, sinon WiFi
  timeout: 12_000,          // 12 secondes max
  maximumAge: 0,            // ne jamais utiliser un cache
};

function toHumanError(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Permission de géolocalisation refusée. Autorisez l'accès à votre position dans les paramètres du navigateur.";
    case err.POSITION_UNAVAILABLE:
      return "Position indisponible. Vérifiez que le GPS ou le WiFi est activé sur votre appareil.";
    case err.TIMEOUT:
      return "Délai dépassé. La récupération de la position a pris trop de temps. Réessayez.";
    default:
      return "Impossible d'obtenir votre position. Réessayez.";
  }
}

export function useGeolocation(): UseGeolocationReturn {
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * One-shot : retourne les coordonnées via Promise.
   * Lance une GeolocationError typée si l'accès est refusé ou indisponible.
   */
  const getPosition = useCallback((): Promise<GeoCoords> => {
    return new Promise((resolve, reject) => {
      if (!navigator?.geolocation) {
        reject(new Error("La géolocalisation n'est pas supportée par votre navigateur."));
        return;
      }
      setLocating(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocating(false);
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => {
          setLocating(false);
          const msg = toHumanError(err);
          setError(msg);
          reject(new Error(msg));
        },
        GEO_OPTIONS
      );
    });
  }, []);

  /**
   * Formulaire : capture et stocke les coordonnées dans l'état local.
   * Idéal pour remplir automatiquement les champs lat/lng d'un formulaire.
   */
  const capturePosition = useCallback(() => {
    if (!navigator?.geolocation) {
      setError("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    setLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        setLocating(false);
        setError(toHumanError(err));
      },
      GEO_OPTIONS
    );
  }, []);

  const reset = useCallback(() => {
    setCoords(null);
    setError(null);
  }, []);

  return { getPosition, capturePosition, coords, locating, error, reset };
}
