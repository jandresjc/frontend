import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import { ParentComponent } from './../parent/parent.component';
import { OPEN_CAMPAIGNS_FORM } from '../../reducers/openCampaignsForm.reducer';
import { Campaign } from '../../models/campaign';
import { CampaingsList } from '../../models/campaingsList';
import { SET_CAMPAIGNS_LIST } from '../../reducers/campaignsList.reducer';
import { CampaignAPIService } from '../../services/api-routes/campaigns.service';
import { UserAPIService } from '../../services/api-routes/user.service';
import { CompleterService, CompleterData, CompleterItem } from 'ng2-completer';
import { HttpEventType, HttpParams } from '@angular/common/http';
import { UploadAPIService } from '../../services/api-routes/upload.service';
import jsmediatags from 'jsmediatags';
import { UtilService } from '../../services/util.service';
import { User } from '../../models/user';

@Component({
  selector: 'app-campaign',
  templateUrl: './campaign.component.html',
  styleUrls: ['./campaign.component.scss']
})
export class CampaignComponent extends ParentComponent implements OnInit {

  titleError: string;
  loading: boolean;
  done: boolean;
  openCampaignsFormReducer: Observable<boolean>;
  user: Observable<User>;
  campaignForm: FormGroup;
  userAvatar: any;
  isUploading: boolean;
  uploadProgress: any;
  selectedPicture: any = null;
  searchUserName: string = '';
  initialValue: string = 'a';
  usersList: any = [];
  selectedMembers: any = [];
  selectedMemberIds: any = [];
  dataService: CompleterData = this.completerService.local(this.usersList, 'id,username', 'username');
  uploadLoading: boolean;
  progress: any;
  message: any;
  userId: number = 0;
  fileName: string = '';

  constructor(
    private formBuilder: FormBuilder,
    private store: Store<any>,
    private campaignAPIService: CampaignAPIService,
    private userAPIService: UserAPIService,
    private completerService: CompleterService,
    private uploadAPIService: UploadAPIService,
    private util: UtilService
  ) {
    super();
  }

  ngOnInit() {
    this.user = this.store.select('userReducer');
    this.openCampaignsFormReducer = this.store.select('openCampaignsFormReducer');

    this.campaignForm = this.formBuilder.group({
      title : [ null, Validators.required ],
      artistic_name: [ null, Validators.required ],
      video_link: [ null, Validators.required ],
      description: [null],
      searchUserName: [null]
    });

    this.getUsers(null);

    this.subscribers.userReducer = this.user.subscribe(
      user => {
        // this.userId = user.id;
      }
    );
  }

  getUsers(event) {
    this.searchUserName = this.initialValue === '' ? this.campaignForm.value.searchUserName : this.initialValue;
    this.userAPIService.searchUsers(this.searchUserName)
      .finally(() => {
        this.loading = false;
      })
      .subscribe(data => {
          this.usersList = data['results'];
          this.initialValue = '';
          this.dataService = this.completerService.local(this.usersList, 'id,username', 'first_name,last_name');
        },
        err => {
          if (err.status === 409 || err.status === 406) {
            this.titleError = err.error.error;
          } else {
            this.titleError = 'Something went wrong! Try again.';
          }
        }
      );
  }

  selectMember(selected: CompleterItem) {
    if (selected != null && this.selectedMemberIds.indexOf(selected.originalObject.id) === -1) {
      this.selectedMemberIds.push(selected.originalObject.id);
      this.selectedMembers.push(selected.originalObject);
    }
    this.campaignForm.value.searchUserName = '';
    this.initialValue = '';
  }

  removeMember(id) {
    this.selectedMemberIds = this.selectedMemberIds.filter(function(item) {
      return item !== id;
    });

    this.selectedMembers = this.selectedMembers.filter(function(item) {
      return item.id !== id;
    });
  }

  createCampaign(event) {
    event.preventDefault();
    this.loading = true;
    const campaign = {
      'title': this.campaignForm.value.title,
      'artistic_name': this.campaignForm.value.artistic_name,
      'video_link': this.campaignForm.value.video_link,
      'description': this.campaignForm.value.description,
      'members': this.selectedMemberIds,
      'picture': this.fileName
    };
    let body = new HttpParams();
    for (const attribute in campaign) {
      if (Array.isArray(campaign[attribute])) {
        for (let i = 0; i < campaign[attribute].length; i++) {
          body = body.append(attribute.toString() + '', campaign[attribute][i]);
        }
      } else {
        body = body.set(attribute, campaign[attribute]);
      }
    }

    this.campaignAPIService.createCampaign(body.toString())
        .finally(() => {
          this.loading = false;
        })
        .subscribe(data => {
        this.done = true;
        setTimeout(() => {
          this.store.dispatch({type: OPEN_CAMPAIGNS_FORM, payload: false});
          this.campaignAPIService.getCampaigns()
            .subscribe(
            data => {
              const campaignsList: CampaingsList = new CampaingsList();
              const result = data['results'];
              for (const campaign in result) {
                campaignsList.campaings.push(
                  Object.assign(
                    new Campaign(),  result[campaign], {
                      artisticName: result[campaign]['artistic_name'],
                      videoLink: result[campaign]['video_link'],
                    }
                  )
                );
              }
              this.store.dispatch({type: SET_CAMPAIGNS_LIST, payload: campaignsList});
              this.clearData();
            },
            err => {
              console.log(err);
            }
          );

        }, 1000);
      },
      err => {
        if (err.status === 409 || err.status === 406) {
          this.titleError = err.error.error;
        } else {
          this.titleError = 'Something went wrong! Try again.';
        }
      }
    );
  }

  getFileNameWithTimestamp(fileName) {
    const date = new Date();
    return this.userId.toString() +
      '_' + fileName.replace(/[^A-Z0-9]/ig, '') + '_' + date.getFullYear().toString() +
      '_' + (date.getMonth() + 1).toString() +
      '_' + date.getDate().toString() +
      '_' + (date.getHours() + 1).toString() +
      '_' + (date.getMinutes() + 1).toString() +
      '_' + (date.getSeconds() + 1).toString();
  }

  setFile(event) {
    this.selectedPicture = event.target.files ? event.target.files[0] : {};
    const formData: FormData = new FormData();
    formData.append('file', this.selectedPicture);

    this.fileName = this.getFileNameWithTimestamp(this.selectedPicture.name);

    this.uploadAPIService.getFilename(this.fileName)
      .subscribe(response => {
        this.selectedPicture = response['url'];
        this.uploadAPIService.uploadFile(response.url, formData)
          .finally(() => {
            this.uploadLoading = false;
          })
          .subscribe(
            event  => {
              if (event.type === HttpEventType.UploadProgress) {
                const progress = Math.floor((event.loaded * 100) / event.total);
                const current = this.util.toMB(event.loaded);
                const total = this.util.toMB(event.total);
                this.progress =  {'progress': progress, 'current': current, 'total': total};
              } else if (event.type === HttpEventType.Response) {
                // Done
                this.selectedPicture = event.body['response'].upload;
              }
            },
            err => {
              this.message = {
                type: 'danger',
                data: 'Upload failed. Please try again'
              };
            }
          );
      }
    );
  }

  close(event) {
    event.preventDefault();
    this.clearData();
    this.store.dispatch({type: OPEN_CAMPAIGNS_FORM, payload: false});
  }

  clearData() {
    this.campaignForm.reset();
    this.selectedMemberIds = [];
    this.selectedMembers = [];
    this.done = false;
  }
}
