import AbstractHandler from './abstract-handler'
import helper from '../lib/helper'
import RSIAxios from '../lib/rsi-axios'
import RSIExpected from '../lib/rsi-expected'
import merge from 'deepmerge'
import mppSQLAxios from '../lib/mpp-sql-adapter-axios'

export class RSISystemAddMemberHandler extends AbstractHandler {
  async main (callback) {
    try {
      const jobData = await this.getJobData()
      if (Boolean(jobData) && jobData.length) {
        this._currentJobData = jobData
        console.log('Processing Data: ', jobData.length)
        const self = this
        await Promise.all(jobData.map(async (user) => {
          try {
            const { data: createResult } = await self.addRSIMember(user)
            try {
              if (createResult) {
                await self.sendUserToMpp(createResult, user)
              }
              self._successQueue.push({ data: user, result: createResult })
            } catch (error) {
              console.error('Failure for: ', user, '\nError: ', error)
              if (self.isClientError(error)) {
                self._notifyQueue.push({ data: user, error: error })
              } else {
                self._failedQueue.push({ data: user, error: error })
              }
            }
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

  async addRSIMember (user) {
    const jobInfo = this.getContextLocalData('jobInfo')
    const RSIMember = merge(RSIExpected[jobInfo.targetEndpoint], user, {
      customMerge: (key) => {
        if (!user[key]) {
          return RSIExpected[jobInfo.targetEndpoint][key]
        }
      }
    })
    const response = await RSIAxios.post(jobInfo.targetEndpoint, RSIMember)
    console.log('Add Request:\n', RSIAxios.defaults.baseURL + jobInfo.targetEndpoint, '\n', RSIMember)
    console.log('Add Response:\n', RSIAxios.defaults.baseURL + jobInfo.targetEndpoint, '\n',
      response.hasOwnProperty('data') && response.data ? response.data : response)
    if (response.hasOwnProperty('data') && response.data.isSuccess) {
      return response
    }
    throw new Error(JSON.stringify(response.data))
  }

  async sendUserToMpp (userResponse, userRequest) {
    const jobInfo = this.getContextLocalData('jobInfo')
    if (jobInfo.usersQuery && userRequest.clubReferenceId) {
      const response = await mppSQLAxios.post('/queries', {
        query: jobInfo.usersQuery,
        options: {
          type: 'SELECT',
          bind: {
            clubReferenceId: userRequest.clubReferenceId,
            rsiMemberId: userResponse.rsiMemberId,
            vipMemberId: userResponse.vipMemberId,
            crmMemberId: userResponse.crmMemberId,
            crmUserId: userResponse.crmUserId
          }
        }
      })
      console.log(response)
      if (response.hasOwnProperty('data') && response.data) {
        return response
      }
      throw new Error(JSON.stringify(response.data))
    }
  }
}

export const jobInfo = {
  id: 'rsiSystemAddUser',
  name: 'Add MPP user to RSI System API',
  query: 'EXEC [dbo].[RSI_AddUser]',
  usersQuery: 'EXEC [dbo].[RSI_InboundUser] @commid=@clubReferenceId @rsiMemberId=@rsiMemberId @vipMemberId=@vipMemberId @crmMemberId=@crmMemberId @crmUserId=@crmUserId',
  targetEndpoint: '/member/'
}

export const main = async (event, context, callback) => {
  context['localData'] = {
    jobInfo: jobInfo
  }
  const handler = new RSISystemAddMemberHandler(event, context)
  await handler.main(callback)
}
