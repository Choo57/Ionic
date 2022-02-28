import { Client } from './client';

export class AdminRooms {
    constructor(public name: string, public userlist:Client[], public totalCusts: number, public imgURL: string) {}
}