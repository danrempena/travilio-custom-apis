import MockAdapter from 'axios-mock-adapter'
import jwt from 'jsonwebtoken'
import each from 'jest-each'
import hash from 'object-hash'
import faker from 'faker'
import { TravilioSystemAddMemberHandler, jobInfo, main } from '../handlers/add-member-handler'
import * as mockCloudwatchScheduledEvent from '../mocks/events/cloudwatch-scheduled-event.json'
import * as mockLambdaReinvokeEvent from '../mocks/events/lambda-reinvoke-event.json'
import mockRequest from '../mocks/travilio-system/add-member/request'
import mockResponse from '../mocks/travilio-system/add-member/response'
import travilioAxios from '../lib/travilio-axios'
import travilioExpected from '../lib/travilio-expected'
import msaAxios from '../lib/mpp-sql-adapter-axios'
import helper from '../lib/helper'

jest.mock('../lib/helper')

describe('[' + jobInfo.id + '] ' + jobInfo.name, () => {
  const testCases = [
    ['aws.events', mockCloudwatchScheduledEvent],
    ['aws.lambda', mockLambdaReinvokeEvent]
  ]
  const mockMsaAccessToken = jwt.sign({ userId: 1 }, 'secret', { expiresIn: '30d' })
  const mockMsaLAxios = new MockAdapter(msaAxios)
  const mockTravilioAxios = new MockAdapter(travilioAxios)
  const mockJobContext = {
    functionName: 'add-travilio-member',
    localData: {
      jobInfo: jobInfo
    }
  }
  let mockMPPRequestData = []

  beforeAll(() => {
    jest.resetModules()
    helper._set_mock_client_credentials()
    helper._set_mock_access_token(mockMsaAccessToken)
  })

  afterAll(() => {
    helper._aws_mock_restore()
  })

  beforeEach(() => {
    mockMPPRequestData = mockRequest.generateMembers(faker.random.number({ min: 1, max: 10 }))
    mockMsaLAxios.onPost('/queries').reply(200, mockMPPRequestData)
    mockLambdaReinvokeEvent.payload = JSON.stringify(mockMPPRequestData)
    mockLambdaReinvokeEvent.md5Payload = hash.MD5(mockLambdaReinvokeEvent.payload)
    mockLambdaReinvokeEvent.retries = 1
    mockLambdaReinvokeEvent.receiptHandle = faker.random.uuid()
  })

  afterEach(() => {
    jest.clearAllMocks()
    mockTravilioAxios.reset()
    mockMsaLAxios.reset()
    mockMPPRequestData = []
  })

  describe('All Test Cases', () => {
    each(testCases).test('%s - mpp adapter should return list of users with format', async (source, mockEvent) => {
      const handler = new TravilioSystemAddMemberHandler(mockEvent, mockJobContext)
      const data = await handler.getJobData()
      const expected = JSON.stringify(data)
      const mocked = JSON.stringify(mockMPPRequestData)
      expect(mocked).toEqual(expected)
    })

    each(testCases).test('%s - should have proper data and format for client custom api', async (source, mockEvent) => {
      mockTravilioAxios.onPost(jobInfo.targetEndpoint).reply(config => {
        expect(config.headers['Content-Type']).toEqual('application/json')
        expect(config.headers['Authorization']).toEqual('Bearer '+'')
        const data = JSON.parse(config.data)
        const expectedFields = Object.keys(travilioExpected[jobInfo.targetEndpoint])
        const dataKeys = Object.keys(data)
        for (let prop of expectedFields) {
          expect(dataKeys).toContain(prop)
        }
        for (let prop of dataKeys) {
          expect(data[prop]).toBeDefined()
        }
        return [200, mockResponse.success]
      })
      const handler = new TravilioSystemAddMemberHandler(mockEvent, mockJobContext)
      await Promise.all(mockMPPRequestData.map(async (mockSampleData) => {
        const { status, data } = await handler.addTravilioMember(mockSampleData)
        expect(status).toEqual(200)
        expect(data).toEqual(mockResponse.success)
      }))
    })

    each(testCases).test('%s - should be able to send email notifications for errors upon MPP query', async (source, mockEvent) => {
      mockMsaLAxios.onPost('/queries').networkError()
      const localEvent = { ...mockEvent }
      if (source === 'aws.lambda') {
        localEvent.payload = ''
      }
      const handler = new TravilioSystemAddMemberHandler(localEvent, mockJobContext)
      const callback = (error, result) => {
        expect(error).toBeTruthy()
        expect(helper.notify_on_error).toHaveBeenCalledTimes(1)
        if (handler.isReinvoked()) {
          expect(helper.release_failed_job).toHaveBeenCalledTimes(1)
          expect(helper.release_failed_job).toHaveBeenCalledWith(localEvent.receiptHandle)
        }
      }
      await handler.main(callback)
    })
  })

  describe('Test Case: aws.events', () => {
    test('should be able to execute all successfully from main', async () => {
      const callback = (error, result) => {
        expect(error).toBeNull()
        expect(result).toHaveProperty('fail')
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('notify')
        expect(result.fail).toHaveLength(0)
        expect(result.notify).toHaveLength(0)
        expect(result.success).toHaveLength(mockMPPRequestData.length)
        result.success.map(suc => {
          expect(suc).toHaveProperty('data')
          expect(suc).toHaveProperty('result')
        })
      }
      mockTravilioAxios.onPost(jobInfo.targetEndpoint).reply(200, mockResponse.success)
      await main(mockCloudwatchScheduledEvent, mockJobContext, callback)
    })

    test('should be able to enqueue failed job data from main', async () => {
      const callback = (error, result) => {
        expect(error).toBeNull()
        expect(result).toHaveProperty('fail')
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('notify')
        expect(result.fail).toHaveLength(mockMPPRequestData.length)
        expect(result.success).toHaveLength(0)
        expect(result.notify).toHaveLength(0)
        result.fail.map(failure => {
          expect(failure).toHaveProperty('data')
          expect(failure).toHaveProperty('error')
        })
        expect(helper.enqueue_failed_job).toHaveBeenCalledTimes(1)
        expect(helper.enqueue_failed_job).toHaveBeenCalledWith(
          result.fail,
          mockJobContext.functionName
        )
      }
      mockTravilioAxios.onPost(jobInfo.targetEndpoint).reply(200, mockResponse.fail)
      await main(mockCloudwatchScheduledEvent, mockJobContext, callback)
    })

    test('should be able to enqueue network errors from main', async () => {
      const callback = (error, result) => {
        expect(error).toBeNull()
        expect(result).toHaveProperty('fail')
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('notify')
        expect(result.fail).toHaveLength(mockMPPRequestData.length)
        expect(result.success).toHaveLength(0)
        expect(result.notify).toHaveLength(0)
        result.fail.map(failure => {
          expect(failure).toHaveProperty('data')
          expect(failure).toHaveProperty('error')
        })
        expect(helper.enqueue_failed_job).toHaveBeenCalledTimes(1)
        expect(helper.enqueue_failed_job).toHaveBeenCalledWith(
          result.fail,
          mockJobContext.functionName
        )
      }
      mockTravilioAxios.onPost(jobInfo.targetEndpoint).networkError()
      await main(mockCloudwatchScheduledEvent, mockJobContext, callback)
    })

    test('should be able to send email notifications for invalid client data from main', async () => {
      const callback = (error, result) => {
        expect(error).toBeNull()
        expect(result).toHaveProperty('fail')
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('notify')
        expect(result.fail).toHaveLength(0)
        expect(result.success).toHaveLength(0)
        expect(result.notify).toHaveLength(mockMPPRequestData.length)
        result.notify.map(failure => {
          expect(failure).toHaveProperty('data')
          expect(failure).toHaveProperty('error')
        })
        expect(helper.notify_on_failed_queue).toHaveBeenCalledTimes(1)
        expect(helper.enqueue_failed_job).not.toHaveBeenCalled()
      }
      mockTravilioAxios.onPost(jobInfo.targetEndpoint).reply(400, {})
      await main(mockCloudwatchScheduledEvent, mockJobContext, callback)
    })
  })

  describe('Test Case: aws.lambda (Re-Invoke)', () => {
    test('should be able to execute all successfully from main', async () => {
      const callback = (error, result) => {
        expect(error).toBeNull()
        expect(result).toHaveProperty('fail')
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('notify')
        expect(result.fail).toHaveLength(0)
        expect(result.notify).toHaveLength(0)
        expect(result.success).toHaveLength(mockMPPRequestData.length)
        result.success.map(suc => {
          expect(suc).toHaveProperty('data')
          expect(suc).toHaveProperty('result')
        })
        expect(helper.delete_failed_job).toHaveBeenCalledTimes(1)
        expect(helper.delete_failed_job).toHaveBeenCalledWith(
          mockLambdaReinvokeEvent.receiptHandle
        )
      }
      mockTravilioAxios.onPost(jobInfo.targetEndpoint).reply(200, mockResponse.success)
      await main(mockLambdaReinvokeEvent, mockJobContext, callback)
    })

    test('should be able to re-enqueue failed job data from main', async () => {
      const callback = (error, result) => {
        expect(error).toBeNull()
        expect(result).toHaveProperty('fail')
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('notify')
        expect(result.fail).toHaveLength(mockMPPRequestData.length)
        expect(result.success).toHaveLength(0)
        expect(result.notify).toHaveLength(0)
        result.fail.map(failure => {
          expect(failure).toHaveProperty('data')
          expect(failure).toHaveProperty('error')
        })
        expect(helper.release_failed_job).toHaveBeenCalledTimes(1)
        expect(helper.release_failed_job).toHaveBeenCalledWith(
          mockLambdaReinvokeEvent.receiptHandle
        )
      }
      mockTravilioAxios.onPost(jobInfo.targetEndpoint).reply(200, mockResponse.fail)
      await main(mockLambdaReinvokeEvent, mockJobContext, callback)
    })

    test('should be able to re-enqueue network errors from main', async () => {
      const callback = (error, result) => {
        expect(error).toBeNull()
        expect(result).toHaveProperty('fail')
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('notify')
        expect(result.fail).toHaveLength(mockMPPRequestData.length)
        expect(result.success).toHaveLength(0)
        expect(result.notify).toHaveLength(0)
        result.fail.map(failure => {
          expect(failure).toHaveProperty('data')
          expect(failure).toHaveProperty('error')
        })
        expect(helper.release_failed_job).toHaveBeenCalledTimes(1)
        expect(helper.release_failed_job).toHaveBeenCalledWith(
          mockLambdaReinvokeEvent.receiptHandle
        )
      }
      mockTravilioAxios.onPost(jobInfo.targetEndpoint).networkError()
      await main(mockLambdaReinvokeEvent, mockJobContext, callback)
    })

    test('should be able to re-enqueue partially failed job data from main', async () => {
      const failMax = 1
      let failCount = 0
      const callback = (error, result) => {
        expect(error).toBeNull()
        expect(result).toHaveProperty('fail')
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('notify')
        expect(result.notify).toHaveLength(0)
        expect(result.fail).toHaveLength(failCount)
        expect(result.success).toHaveLength(mockMPPRequestData.length - failCount)
        result.fail.map(failure => {
          expect(failure).toHaveProperty('data')
          expect(failure).toHaveProperty('error')
        })
        expect(helper.delete_failed_job).toHaveBeenCalledTimes(1)
        expect(helper.delete_failed_job).toHaveBeenCalledWith(
          mockLambdaReinvokeEvent.receiptHandle
        )
        expect(helper.enqueue_failed_job).toHaveBeenCalledTimes(1)
        expect(helper.enqueue_failed_job).toHaveBeenCalledWith(
          result.fail,
          mockJobContext.functionName
        )
      }
      mockTravilioAxios.onPost(jobInfo.targetEndpoint).reply(() => {
        if (failCount < failMax) {
          failCount++
          return [200, mockResponse.fail]
        }
        return [200, mockResponse.success]
      })
      await main(mockLambdaReinvokeEvent, mockJobContext, callback)
    })

    test('should be able to send email notifications for invalid client data from main', async () => {
      const callback = (error, result) => {
        expect(error).toBeNull()
        expect(result).toHaveProperty('fail')
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('notify')
        expect(result.notify).toHaveLength(mockMPPRequestData.length)
        expect(result.fail).toHaveLength(0)
        expect(result.success).toHaveLength(0)
        result.notify.map(failure => {
          expect(failure).toHaveProperty('data')
          expect(failure).toHaveProperty('error')
        })
        expect(helper.notify_on_failed_queue).toHaveBeenCalledTimes(1)
        expect(helper.release_failed_job).not.toHaveBeenCalled()
        expect(helper.delete_failed_job).toHaveBeenCalledTimes(1)
        expect(helper.delete_failed_job).toHaveBeenCalledWith(
          mockLambdaReinvokeEvent.receiptHandle
        )
      }
      mockTravilioAxios.onPost(jobInfo.targetEndpoint).reply(400, {})
      await main(mockLambdaReinvokeEvent, mockJobContext, callback)
    })

    test('should be able to send email notifications for failed job data that exceed retries threshold from main', async () => {
      const localEvent = { ...mockLambdaReinvokeEvent, ...{ retries: process.env.DEFAULT_NOTIFY_RETRIES_THRESHOLD } }
      const callback = (error, result) => {
        expect(error).toBeNull()
        expect(result).toHaveProperty('fail')
        expect(result).toHaveProperty('success')
        expect(result.fail).toHaveLength(mockMPPRequestData.length)
        expect(result.success).toHaveLength(0)
        result.fail.map(failure => {
          expect(failure).toHaveProperty('data')
          expect(failure).toHaveProperty('error')
        })
        expect(helper.notify_on_failed_queue).toHaveBeenCalledTimes(1)
        expect(helper.notify_on_failed_queue).toHaveBeenCalled()
        expect(helper.release_failed_job).toHaveBeenCalledTimes(1)
        expect(helper.release_failed_job).toHaveBeenCalledWith(
          mockLambdaReinvokeEvent.receiptHandle
        )
      }
      mockTravilioAxios.onPost(jobInfo.targetEndpoint).reply(200, mockResponse.fail)
      await main(localEvent, mockJobContext, callback)
    })
  })
})
