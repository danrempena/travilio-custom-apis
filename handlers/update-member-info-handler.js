import AbstractHandler from './abstract-handler'
import helper from '../lib/helper'
import RSIAxios from '../lib/rsi-axios'
import merge from 'deepmerge'
import RSIExpected from '../lib/rsi-expected'

export class RSISystemUpdateMemberInfoHandler extends AbstractHandler {
  async main (callback) {
    try {
      const jobData = await this.getJobData()
      if (Boolean(jobData) && jobData.length) {
        this._currentJobData = jobData
        console.log('Processing Data: ', jobData.length)
        const self = this
        await Promise.all(jobData.map(async (user) => {
          try {
            const { data: updateResult } = await self.updateRSIMemberInfo(user)
            self._successQueue.push({ data: user, result: updateResult })
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

  async updateRSIMemberInfo (user) {
    const jobInfo = this.getContextLocalData('jobInfo')
    let rsiUpdateRequest = { ...user }
    if (rsiUpdateRequest.hasOwnProperty('firstName')) {
      if (rsiUpdateRequest.firstName) {
        rsiUpdateRequest.first_name = rsiUpdateRequest.firstName
      }
      delete rsiUpdateRequest.firstName
    }
    if (rsiUpdateRequest.lastName) {
      if (rsiUpdateRequest.lastName) {
        rsiUpdateRequest.last_name = rsiUpdateRequest.lastName
      }
      delete rsiUpdateRequest.lastName
    }
    if (rsiUpdateRequest.clubReferenceId) {
      if (rsiUpdateRequest.clubReferenceId) {
        rsiUpdateRequest.clubReference = rsiUpdateRequest.clubReferenceId
      }
      delete rsiUpdateRequest.clubReferenceId
    }
    rsiUpdateRequest = merge(RSIExpected[jobInfo.targetEndpoint], rsiUpdateRequest, {
      customMerge: (key) => {
        if (!rsiUpdateRequest[key]) {
          return RSIExpected[jobInfo.targetEndpoint][key]
        }
      }
    })
    console.log(rsiUpdateRequest)
    const response = await RSIAxios.put(jobInfo.targetEndpoint, rsiUpdateRequest)
    console.log('Add Request:\n', RSIAxios.defaults.baseURL + jobInfo.targetEndpoint, '\n', rsiUpdateRequest)
    console.log('Add Response:\n', RSIAxios.defaults.baseURL + jobInfo.targetEndpoint, '\n',
      response.hasOwnProperty('data') && response.data ? response.data : response)
    if (response.hasOwnProperty('data') && response.data.is_success) {
      return response
    }
    throw new Error(JSON.stringify(response.data))
  }
}

export const jobInfo = {
  id: 'rsiSystemUpdateUserInfo',
  name: 'Update MPP user info to RSI System API',
  query: 'EXEC [dbo].[RSI_UpdatedUser]',
  targetEndpoint: '/member'
}

export const main = async (event, context, callback) => {
  context['localData'] = {
    jobInfo: jobInfo
  }
  const handler = new RSISystemUpdateMemberInfoHandler(event, context)
  await handler.main(callback)
}
