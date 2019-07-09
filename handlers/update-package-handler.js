import AbstractHandler from './abstract-handler'
import helper from '../lib/helper'
import RSIAxios from '../lib/rsi-axios'
import RSIExpected from '../lib/rsi-expected'
import merge from 'deepmerge'

export class RSISystemUpdatePackageHandler extends AbstractHandler {
  async main (callback) {
    try {
      const jobData = await this.getJobData()
      if (Boolean(jobData) && jobData.length) {
        this._currentJobData = jobData
        console.log('Processing Data: ', jobData.length)
        const self = this
        await Promise.all(jobData.map(async (data) => {
          try {
            const { data: updateResult } = await self.updateRSIPackage(data)
            self._successQueue.push({ data: data, result: updateResult })
          } catch (error) {
            console.error('Failure for: ', data, '\nError: ', error)
            if (self.isClientError(error)) {
              self._notifyQueue.push({ data: data, error: error })
            } else {
              self._failedQueue.push({ data: data, error: error })
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

  async updateRSIPackage (data) {
    const jobInfo = this.getContextLocalData('jobInfo')
    const RSIMember = merge(RSIExpected[jobInfo.targetEndpoint], data, {
      customMerge: (key) => {
        if (!data[key]) {
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
  const handler = new RSISystemUpdatePackageHandler(event, context)
  await handler.main(callback)
}
