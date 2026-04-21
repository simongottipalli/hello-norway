/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import type { TsoaRoute } from '@tsoa/runtime';
import {  fetchMiddlewares, ExpressTemplateService } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { TaskController } from './../controllers/TaskController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { OtpController } from './../controllers/OtpController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { OnboardingController } from './../controllers/OnboardingController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { AuthController } from './../controllers/AuthController';
import { expressAuthentication } from './../middleware/tsoaAuthentication';
// @ts-ignore - no great way to install types from subpackage
import type { Request as ExRequest, Response as ExResponse, RequestHandler, Router } from 'express';

const expressAuthenticationRecasted = expressAuthentication as (req: ExRequest, securityName: string, scopes?: string[], res?: ExResponse) => Promise<any>;


// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

const models: TsoaRoute.Models = {
    "TaskCategory": {
        "dataType": "refEnum",
        "enums": ["ARRIVAL","IDENTITY_BANKING","HEALTH","TAX_WORK","FAMILY","HOUSING","DRIVING","OTHER"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EmploymentStatus": {
        "dataType": "refEnum",
        "enums": ["EMPLOYED","SELF_EMPLOYED","UNEMPLOYED","STUDENT","OTHER"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateTaskDto": {
        "dataType": "refObject",
        "properties": {
            "title": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":140}}},
            "shortDescription": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":280}}},
            "body": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":50000}}},
            "category": {"ref":"TaskCategory","required":true},
            "slug": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":80}}},
            "sortOrder": {"dataType":"integer","required":true,"validators":{"minimum":{"value":0},"maximum":{"value":32767}}},
            "officialLinks": {"dataType":"any"},
            "requiresEU": {"dataType":"union","subSchemas":[{"dataType":"boolean"},{"dataType":"enum","enums":[null]}]},
            "requiresEmploymentStatus": {"dataType":"union","subSchemas":[{"dataType":"array","array":{"dataType":"refEnum","ref":"EmploymentStatus"}},{"dataType":"enum","enums":[null]}]},
            "requiresChildren": {"dataType":"union","subSchemas":[{"dataType":"boolean"},{"dataType":"enum","enums":[null]}]},
            "minDaysFromArrival": {"dataType":"union","subSchemas":[{"dataType":"integer"},{"dataType":"enum","enums":[null]}],"validators":{"minimum":{"value":-32768},"maximum":{"value":32767}}},
            "maxDaysFromArrival": {"dataType":"union","subSchemas":[{"dataType":"integer"},{"dataType":"enum","enums":[null]}],"validators":{"minimum":{"value":-32768},"maximum":{"value":32767}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TaskStatusValue": {
        "dataType": "refEnum",
        "enums": ["not_started","in_progress","completed","todo","saved","done"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateTaskStatusDto": {
        "dataType": "refObject",
        "properties": {
            "status": {"ref":"TaskStatusValue","required":true},
            "dueDate": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "personalNotes": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OtpResponseDto": {
        "dataType": "refObject",
        "properties": {
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Record_string.unknown_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{},"additionalProperties":{"dataType":"any"},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RequestOtpDto": {
        "dataType": "refObject",
        "properties": {
            "email": {"dataType":"string","required":true,"validators":{"maxLength":{"value":320}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "VerifyOtpSuccessDto": {
        "dataType": "refObject",
        "properties": {
            "message": {"dataType":"string","required":true},
            "success": {"dataType":"boolean","required":true},
            "sessionToken": {"dataType":"string","required":true},
            "user": {"dataType":"nestedObjectLiteral","nestedProperties":{"name":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},"email":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "VerifyOtpDto": {
        "dataType": "refObject",
        "properties": {
            "email": {"dataType":"string","required":true,"validators":{"maxLength":{"value":320}}},
            "code": {"dataType":"integer","required":true,"validators":{"minimum":{"value":100000},"maximum":{"value":999999}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OnboardingTaskPreviewDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "title": {"dataType":"string","required":true},
            "shortDescription": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "category": {"ref":"TaskCategory","required":true},
            "sortOrder": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OnboardingProfileDto": {
        "dataType": "refObject",
        "properties": {
            "isEU": {"dataType":"union","subSchemas":[{"dataType":"boolean"},{"dataType":"enum","enums":[null]}]},
            "hasChildren": {"dataType":"union","subSchemas":[{"dataType":"boolean"},{"dataType":"enum","enums":[null]}]},
            "employmentStatus": {"dataType":"union","subSchemas":[{"ref":"EmploymentStatus"},{"dataType":"enum","enums":[null]}]},
            "arrivalDate": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "plannedArrivalDate": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SessionResponseDto": {
        "dataType": "refObject",
        "properties": {
            "authenticated": {"dataType":"boolean","required":true},
            "user": {"dataType":"nestedObjectLiteral","nestedProperties":{"name":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},"email":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"required":true},
            "session": {"dataType":"nestedObjectLiteral","nestedProperties":{"expiresAt":{"dataType":"datetime","required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateProfileDto": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","validators":{"minLength":{"value":1},"maxLength":{"value":255}}},
            "isEU": {"dataType":"union","subSchemas":[{"dataType":"boolean"},{"dataType":"enum","enums":[null]}]},
            "hasChildren": {"dataType":"union","subSchemas":[{"dataType":"boolean"},{"dataType":"enum","enums":[null]}]},
            "employmentStatus": {"dataType":"union","subSchemas":[{"ref":"EmploymentStatus"},{"dataType":"enum","enums":[null]}]},
            "arrivalDate": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "plannedArrivalDate": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
};
const templateService = new ExpressTemplateService(models, {"noImplicitAdditionalProperties":"throw-on-extras","bodyCoercion":true});

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa




export function RegisterRoutes(app: Router) {

    // ###########################################################################################################
    //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
    //      Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
    // ###########################################################################################################


    
        const argsTaskController_getUserTasks: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/tasks/personalized',
            authenticateMiddleware([{"cookie_auth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TaskController)),
            ...(fetchMiddlewares<RequestHandler>(TaskController.prototype.getUserTasks)),

            async function TaskController_getUserTasks(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTaskController_getUserTasks, request, response });

                const controller = new TaskController();

              await templateService.apiHandler({
                methodName: 'getUserTasks',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTaskController_getTaskById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/tasks/:id',
            authenticateMiddleware([{"cookie_auth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TaskController)),
            ...(fetchMiddlewares<RequestHandler>(TaskController.prototype.getTaskById)),

            async function TaskController_getTaskById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTaskController_getTaskById, request, response });

                const controller = new TaskController();

              await templateService.apiHandler({
                methodName: 'getTaskById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTaskController_createTask: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"CreateTaskDto"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/tasks',
            authenticateMiddleware([{"cookie_auth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TaskController)),
            ...(fetchMiddlewares<RequestHandler>(TaskController.prototype.createTask)),

            async function TaskController_createTask(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTaskController_createTask, request, response });

                const controller = new TaskController();

              await templateService.apiHandler({
                methodName: 'createTask',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTaskController_updateTaskStatus: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateTaskStatusDto"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.patch('/api/tasks/:id/status',
            authenticateMiddleware([{"cookie_auth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TaskController)),
            ...(fetchMiddlewares<RequestHandler>(TaskController.prototype.updateTaskStatus)),

            async function TaskController_updateTaskStatus(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTaskController_updateTaskStatus, request, response });

                const controller = new TaskController();

              await templateService.apiHandler({
                methodName: 'updateTaskStatus',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsOtpController_requestOtp: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"RequestOtpDto"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/otp/generate',
            ...(fetchMiddlewares<RequestHandler>(OtpController)),
            ...(fetchMiddlewares<RequestHandler>(OtpController.prototype.requestOtp)),

            async function OtpController_requestOtp(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOtpController_requestOtp, request, response });

                const controller = new OtpController();

              await templateService.apiHandler({
                methodName: 'requestOtp',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsOtpController_verifyOtp: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"VerifyOtpDto"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/otp/verify',
            ...(fetchMiddlewares<RequestHandler>(OtpController)),
            ...(fetchMiddlewares<RequestHandler>(OtpController.prototype.verifyOtp)),

            async function OtpController_verifyOtp(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOtpController_verifyOtp, request, response });

                const controller = new OtpController();

              await templateService.apiHandler({
                methodName: 'verifyOtp',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsOnboardingController_getTaskPreview: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"OnboardingProfileDto"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/onboarding/tasks',
            ...(fetchMiddlewares<RequestHandler>(OnboardingController)),
            ...(fetchMiddlewares<RequestHandler>(OnboardingController.prototype.getTaskPreview)),

            async function OnboardingController_getTaskPreview(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOnboardingController_getTaskPreview, request, response });

                const controller = new OnboardingController();

              await templateService.apiHandler({
                methodName: 'getTaskPreview',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_getSession: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/auth/session',
            authenticateMiddleware([{"cookie_auth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.getSession)),

            async function AuthController_getSession(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_getSession, request, response });

                const controller = new AuthController();

              await templateService.apiHandler({
                methodName: 'getSession',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_getProfile: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/auth/profile',
            authenticateMiddleware([{"cookie_auth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.getProfile)),

            async function AuthController_getProfile(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_getProfile, request, response });

                const controller = new AuthController();

              await templateService.apiHandler({
                methodName: 'getProfile',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_updateProfile: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"UpdateProfileDto"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.patch('/api/auth/profile',
            authenticateMiddleware([{"cookie_auth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.updateProfile)),

            async function AuthController_updateProfile(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_updateProfile, request, response });

                const controller = new AuthController();

              await templateService.apiHandler({
                methodName: 'updateProfile',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_logout: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/auth/logout',
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.logout)),

            async function AuthController_logout(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_logout, request, response });

                const controller = new AuthController();

              await templateService.apiHandler({
                methodName: 'logout',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_deleteProfile: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.delete('/api/auth/profile',
            authenticateMiddleware([{"cookie_auth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.deleteProfile)),

            async function AuthController_deleteProfile(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_deleteProfile, request, response });

                const controller = new AuthController();

              await templateService.apiHandler({
                methodName: 'deleteProfile',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa


    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    function authenticateMiddleware(security: TsoaRoute.Security[] = []) {
        return async function runAuthenticationMiddleware(request: any, response: any, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            // keep track of failed auth attempts so we can hand back the most
            // recent one.  This behavior was previously existing so preserving it
            // here
            const failedAttempts: any[] = [];
            const pushAndRethrow = (error: any) => {
                failedAttempts.push(error);
                throw error;
            };

            const secMethodOrPromises: Promise<any>[] = [];
            for (const secMethod of security) {
                if (Object.keys(secMethod).length > 1) {
                    const secMethodAndPromises: Promise<any>[] = [];

                    for (const name in secMethod) {
                        secMethodAndPromises.push(
                            expressAuthenticationRecasted(request, name, secMethod[name], response)
                                .catch(pushAndRethrow)
                        );
                    }

                    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

                    secMethodOrPromises.push(Promise.all(secMethodAndPromises)
                        .then(users => { return users[0]; }));
                } else {
                    for (const name in secMethod) {
                        secMethodOrPromises.push(
                            expressAuthenticationRecasted(request, name, secMethod[name], response)
                                .catch(pushAndRethrow)
                        );
                    }
                }
            }

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            try {
                request['user'] = await Promise.any(secMethodOrPromises);

                // Response was sent in middleware, abort
                if (response.writableEnded) {
                    return;
                }

                next();
            }
            catch(err) {
                // Show most recent error as response
                const error = failedAttempts.pop();
                error.status = error.status || 401;

                // Response was sent in middleware, abort
                if (response.writableEnded) {
                    return;
                }
                next(error);
            }

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        }
    }

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
}

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
