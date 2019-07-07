import AbstractHandler from './abstract-handler'
import helper from '../lib/helper'
import travilioAxios from '../lib/travilio-axios'
import travilioExpected from '../lib/travilio-expected'
import merge from 'deepmerge'

export class TravilioSystemAddMemberHandler extends AbstractHandler {
    async main (callback) {
        try {
            const jobData = await this.getJobData()
            if (Boolean(jobData) && jobData.length) {
                this._currentJobData = jobData
                console.log('Processing Data: ', jobData.length)
                const self = this
                await Promise.all(jobData.map(async (user) => {
                    try {
                        const { data: createResult } = await self.addTravilioMember(user)
                        self._successQueue.push({ data: user, result: createResult })
                    } catch (error) {
                        console.error('Failure for: ', user, '\nError: ', error)
                        if (self.isClientError(error)) {
                            self._notifyQueue.push({ data: user, error: error })
                        } else {
                            self._failedQueue.push({ data: user, error: error })
                        }
                    }
                }))
            } else {
                console.log('No available data to process!')
            }
            if (this._failedQueue.length > 0) {
                await this.handleFailedQueue()
            } else if (this.isReinvoked() && this._successQueue.length > 0) {
                await helper.delete_failed_job(this._event.receiptHandle)
            }
            if (this._notifyQueue.length > 0) {
                await this.handleNotifyQueue()
            }
            callback(null, {
                'success': this._successQueue,
                'fail': this._failedQueue,
                'notify': this._notifyQueue
            })
        } catch (error) {
            console.error(error)
            await this.handleFailure(error)
            callback(error)
        }
    }

    async addTravilioMember (user) {
        const jobInfo = this.getContextLocalData('jobInfo')
        const travilioMember = merge(travilioExpected[jobInfo.targetEndpoint], user, {
            customMerge: (key) => {
                if(!user[key]){
                    return travilioExpected[jobInfo.targetEndpoint][key]
                }
            }
        })
        const response = await travilioAxios.post(jobInfo.targetEndpoint, travilioMember)
        console.log('Add Request:\n', travilioAxios.defaults.baseURL + jobInfo.targetEndpoint, '\n', travilioMember)
        console.log('Add Response:\n', travilioAxios.defaults.baseURL + jobInfo.targetEndpoint, '\n',
            response.hasOwnProperty('data') && response.data ? response.data : response)
        if (response.hasOwnProperty('data') && response.data.isSuccess) {
            return response
        }
        throw new Error(JSON.stringify(response.data))
    }
}


export const jobInfo = {
    id: '',
    name: '',
    query: '',
    targetEndpoint: '/member/'
}

export const main = async (event, context, callback) => {
    context['localData'] = {
        jobInfo: jobInfo
    }
    const handler = new TravilioSystemAddMemberHandler(event, context)
    await handler.main(callback)
}
