import {authHandler} from './_device-sessions.js';
export function onRequest(context){return authHandler({request:context.request,env:context.env,waitUntil:promise=>context.waitUntil(promise)});}
