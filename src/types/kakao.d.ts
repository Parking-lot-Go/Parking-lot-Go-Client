/* eslint-disable @typescript-eslint/no-unused-vars */
declare namespace kakao.maps {
  function load(callback: () => void): void;

  class Map {
    constructor(container: HTMLElement, options: {
      center: LatLng;
      level?: number;
      minLevel?: number;
      maxLevel?: number;
    });
    setCenter(latlng: LatLng): void;
    getCenter(): LatLng;
    setLevel(level: number): void;
    getLevel(): number;
    panTo(latlng: LatLng): void;
    getBounds(): LatLngBounds;
    getProjection(): MapProjection;
  }

  interface LatLngBounds {
    getSouthWest(): LatLng;
    getNorthEast(): LatLng;
  }

  interface MapProjection {
    pointFromCoords(latlng: LatLng): Point;
    coordsFromPoint(point: Point): LatLng;
  }

  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
  }

  class Marker {
    constructor(options: { position: LatLng; map?: Map; image?: MarkerImage; title?: string });
    setMap(map: Map | null): void;
    getPosition(): LatLng;
  }

  class MarkerImage {
    constructor(src: string, size: Size, options?: { offset?: Point });
  }

  class Size {
    constructor(width: number, height: number);
  }

  class Point {
    constructor(x: number, y: number);
    x: number;
    y: number;
  }

  class InfoWindow {
    constructor(options?: { content?: string | HTMLElement; removable?: boolean; zIndex?: number });
    open(map: Map, marker?: Marker): void;
    close(): void;
    setContent(content: string | HTMLElement): void;
    setPosition(position: LatLng): void;
  }

  class CustomOverlay {
    constructor(options: {
      position: LatLng;
      content: string | HTMLElement;
      map?: Map;
      xAnchor?: number;
      yAnchor?: number;
      zIndex?: number;
    });
    setMap(map: Map | null): void;
    setContent(content: string | HTMLElement): void;
    setPosition(position: LatLng): void;
  }

  namespace services {
    class Places {
      constructor(map?: Map);
      keywordSearch(
        keyword: string,
        callback: (result: PlaceResult[], status: Status) => void,
        options?: { location?: LatLng; radius?: number; size?: number },
      ): void;
    }

    class Geocoder {
      constructor();
      addressSearch(
        addr: string,
        callback: (result: GeocoderResult[], status: Status) => void,
      ): void;
      coord2RegionCode(
        lng: number,
        lat: number,
        callback: (result: RegionCodeResult[], status: Status) => void,
      ): void;
    }

    interface RegionCodeResult {
      region_type: string;
      region_1depth_name: string;
      region_2depth_name: string;
      region_3depth_name: string;
      region_4depth_name: string;
      code: string;
    }

    interface PlaceResult {
      id: string;
      place_name: string;
      address_name: string;
      road_address_name: string;
      x: string; // lng
      y: string; // lat
      category_group_code: string;
      category_group_name: string;
    }

    interface GeocoderResult {
      address_name: string;
      x: string;
      y: string;
    }

    enum Status {
      OK = 'OK',
      ZERO_RESULT = 'ZERO_RESULT',
      ERROR = 'ERROR',
    }
  }

  namespace event {
    function addListener(target: unknown, type: string, handler: (...args: unknown[]) => void): void;
    function removeListener(target: unknown, type: string, handler: (...args: unknown[]) => void): void;
  }
}

interface Window {
  kakao: typeof kakao;
}
