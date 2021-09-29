import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { plainToClass } from "class-transformer";
import { Application, NextFunction, Request, Response } from "express";
import Result from "../../../common_classes/result";
import { RSARequest, RSAResponse } from "../../../domain_objects/access_management/rsa";
import { authInContainer } from "../../middleware";
import Config from "../../../services/config";

export default class RSARoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post('/rsa/initialize', ...middleware, authInContainer('read', 'data'), this.init)

        app.post('/rsa/verify', ...middleware, authInContainer('read', 'data'), this.verify)

        app.post('/rsa/status', ...middleware, authInContainer('read', 'data'), this.status)

        app.post('/rsa/cancel', ...middleware, authInContainer('read', 'data'), this.cancel)
    }

    /*
    Config: rsa_url (includes port?)
    New Routes file: rsa_routes
    Functions: initialize (with and without securID), verify, status, cancel
    */

    private static init(req: Request, res: Response, next: NextFunction) {
        console.log(req)
        if (req.headers['content-type']?.includes('application/json')) {
            const axiosConfig: AxiosRequestConfig = {
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                    'client-key': Config.rsa_client_key
                }
            };

            const payload = plainToClass(RSARequest, req.body as object);

            axios.post(`${Config.rsa_url}/mfa/v1_1/authn/initialize`, payload, axiosConfig)
                .then((response: AxiosResponse) => {
                    const responsePayload = plainToClass(RSAResponse, response.data as object);
                    Result.Success(responsePayload).asResponse(res)
                })
                .catch((e: string) => {
                    res.status(500).json(e);
                })
                .finally(() => next());
        } else {
            res.status(404).json('Unsupported content type');
            next();
        }
    }

    private static verify(req: Request, res: Response, next: NextFunction) {
        return
    }

    private static status(req: Request, res: Response, next: NextFunction) {
        return
    }

    private static cancel(req: Request, res: Response, next: NextFunction) {
        return
    }
}