import { Injectable } from '@angular/core';
import { APIHandlerService } from '../api-handler.service';
@Injectable()
export class UserAPIService {

    constructor(
        private apiService: APIHandlerService
    ) {}

    getDetail(id) {
        return this.apiService.get(`users/${id}/`);
    }

    getDetailByUsername(username) {
        return this.apiService.get(`users/${username}/`);
    }

    updateUser(data) {
        return this.apiService.put(`users/${data.id}/`, data);
    }

    searchUsers(keyword) {
        return this.apiService.get(`users/search/${keyword}/`);
    }

    currentUser() {
        return this.apiService.get(`users/user/profile`);
    }

    activateUser(code) {
        return this.apiService.post(`users/activate/${code}`);
    }

    uploadAvatar(avatar) {
        return this.apiService.post(`users/update/avatar`, avatar);
    }
}
