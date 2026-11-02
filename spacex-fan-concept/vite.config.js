import {defineConfig} from 'vite';
export default defineConfig({base:'/',build:{target:'es2022',sourcemap:false,chunkSizeWarningLimit:750,rollupOptions:{output:{manualChunks:{three:['three']}}}},server:{host:'0.0.0.0',port:4173,allowedHosts:['.vercel.run']},preview:{host:'0.0.0.0',port:4173,allowedHosts:['.vercel.run']}});
