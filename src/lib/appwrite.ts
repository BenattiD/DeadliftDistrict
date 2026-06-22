/// <reference types="vite/client" />
import { Client, Account, Databases } from 'appwrite';

export const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
export const APPWRITE_PROJECT_ID = '681723df00259b85a99c';
export const APPWRITE_DATABASE_ID = '681724a1002f22745648';
export const APPWRITE_COLLECTION_ID = '681724cb0027345445ed';

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export { client };
