import { type Env, handleRequest } from "../../workers/bg-remove/src/handler";

export const onRequest: PagesFunction<Env> = async (context) => {
  return handleRequest(context.request, context.env);
};
