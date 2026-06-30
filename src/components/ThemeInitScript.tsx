import Script from "next/script";

const THEME_INIT = `(function(){try{var t=document.cookie.match(/theme=([^;]+)/)?.[1]||localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function ThemeInitScript() {
  return (
    <Script id="theme-init" strategy="beforeInteractive">
      {THEME_INIT}
    </Script>
  );
}
