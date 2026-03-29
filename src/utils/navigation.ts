export function openNavigation(lat: number, lng: number, name: string) {
  const provider = localStorage.getItem('preferredNav') || 'naver';
  const encoded = encodeURIComponent(name);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (provider === 'naver') {
    if (isAndroid) {
      window.open(`intent://route/car?dlat=${lat}&dlng=${lng}&dname=${encoded}&appname=carpark#Intent;scheme=nmap;package=com.nhn.android.nmap;end`, '_blank');
    } else if (isIOS) {
      location.href = `nmap://route/car?dlat=${lat}&dlng=${lng}&dname=${encoded}&appname=carpark`;
    } else {
      window.open(`https://map.naver.com/index.nhn?menu=route&pathType=0&elng=${lng}&elat=${lat}&etext=${encoded}`, '_blank');
    }
    return;
  }

  if (isAndroid) {
    window.open(`intent://route?ep=${lat},${lng}&by=CAR&destinationName=${encoded}#Intent;scheme=kakaonavi;package=com.locnall.KimGiSa;end`, '_blank');
  } else if (isIOS) {
    location.href = `kakaonavi://route?ep=${lat},${lng}&by=CAR&destinationName=${encoded}`;
  } else {
    window.open(`https://map.kakao.com/link/to/${encoded},${lat},${lng}`, '_blank');
  }
}
