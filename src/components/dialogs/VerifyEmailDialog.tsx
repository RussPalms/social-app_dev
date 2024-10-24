import React, {useState} from 'react'
import {View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {cleanError} from '#/lib/strings/errors'
import {logger} from '#/logger'
import {useModalControls} from '#/state/modals'
import {useAgent, useSession} from '#/state/session'
import {ErrorMessage} from '#/view/com/util/error/ErrorMessage'
import {atoms as a, useBreakpoints, useTheme, web} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as TextField from '#/components/forms/TextField'
import {Envelope_Filled_Stroke2_Corner0_Rounded as EnvelopeIcon} from '#/components/icons/Envelope'
import {InlineLinkText} from '#/components/Link'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'

export function VerifyEmailDialog({
  control,
  reminder,
}: {
  control: Dialog.DialogControlProps
  reminder?: boolean
}) {
  const agent = useAgent()

  const [didVerify, setDidVerify] = useState(false)

  return (
    <Dialog.Outer
      control={control}
      onClose={async () => {
        if (!didVerify) {
          return
        }

        try {
          await agent.resumeSession(agent.session!)
        } catch (e: unknown) {
          logger.error(String(e))
          return
        }
      }}>
      <Dialog.Handle />
      <Inner
        control={control}
        setDidVerify={setDidVerify}
        reminder={reminder}
      />
    </Dialog.Outer>
  )
}

export function Inner({
  control,
  setDidVerify,
  reminder,
}: {
  control: Dialog.DialogControlProps
  setDidVerify: (value: boolean) => void
  reminder?: boolean
}) {
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const agent = useAgent()
  const {openModal} = useModalControls()
  const {gtMobile} = useBreakpoints()
  const t = useTheme()

  const [currentStep, setCurrentStep] = useState<
    'Reminder' | 'StepOne' | 'StepTwo' | 'StepThree'
  >(reminder ? 'Reminder' : 'StepOne')
  const [confirmationCode, setConfirmationCode] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')

  const uiStrings = {
    Reminder: {
      title: _(msg`Please Verify Your Email`),
      message: _(
        msg`Your email has not yet been verified. This is an important security step which we recommend.`,
      ),
    },
    StepOne: {
      title: _(msg`Verify Your Email`),
      message: '',
    },
    StepTwo: {
      title: _(msg`Enter Code`),
      message: _(
        msg`An email has been sent! Please enter the confirmation code included in the email below.`,
      ),
    },
    StepThree: {
      title: _(msg`Success!`),
      message: _(msg`Thank you! Your email has been successfully verified.`),
    },
  }

  const onSendEmail = async () => {
    setError('')
    setIsProcessing(true)
    try {
      await agent.com.atproto.server.requestEmailConfirmation()
      setCurrentStep('StepTwo')
    } catch (e: unknown) {
      setError(cleanError(e))
    } finally {
      setIsProcessing(false)
    }
  }

  const onVerifyEmail = async () => {
    setError('')
    setIsProcessing(true)
    try {
      await agent.com.atproto.server.confirmEmail({
        email: (currentAccount?.email || '').trim(),
        token: confirmationCode.trim(),
      })
    } catch (e: unknown) {
      setError(cleanError(String(e)))
      setIsProcessing(false)
      return
    }

    setIsProcessing(false)
    setDidVerify(true)
    setCurrentStep('StepThree')
  }

  return (
    <Dialog.ScrollableInner
      label={_(msg`Verify email dialog`)}
      style={web([
        gtMobile ? {width: 'auto', maxWidth: 400, minWidth: 200} : a.w_full,
      ])}>
      <Dialog.Close />
      <View style={[a.gap_xl]}>
        {currentStep === 'Reminder' && (
          <View
            style={[
              a.rounded_sm,
              a.align_center,
              a.justify_center,
              {height: 150, backgroundColor: t.palette.primary_500},
            ]}>
            <EnvelopeIcon width={64} fill="white" />
          </View>
        )}
        <View style={[a.gap_sm]}>
          <Text style={[a.font_heavy, a.text_2xl]}>
            {uiStrings[currentStep].title}
          </Text>
          {error ? (
            <View style={[a.rounded_sm, a.overflow_hidden]}>
              <ErrorMessage message={error} />
            </View>
          ) : null}
          <Text style={[a.text_md, a.leading_snug]}>
            {currentStep === 'StepOne' ? (
              <>
                <Trans>
                  You'll receive an email at{' '}
                  <Text style={[a.text_md, a.leading_snug, a.font_bold]}>
                    {currentAccount?.email}
                  </Text>{' '}
                  to verify it's you.
                </Trans>{' '}
                <InlineLinkText
                  to="#"
                  label={_(msg`Change email address`)}
                  style={[a.text_md, a.leading_snug]}
                  onPress={e => {
                    e.preventDefault()
                    control.close(() => {
                      openModal({name: 'change-email'})
                    })
                    return false
                  }}>
                  <Trans>Need to change it?</Trans>
                </InlineLinkText>
              </>
            ) : (
              uiStrings[currentStep].message
            )}
          </Text>
        </View>
        {currentStep === 'StepTwo' ? (
          <View>
            <TextField.LabelText>
              <Trans>Confirmation Code</Trans>
            </TextField.LabelText>
            <TextField.Root>
              <TextField.Input
                label={_(msg`Confirmation code`)}
                placeholder="XXXXX-XXXXX"
                onChangeText={setConfirmationCode}
              />
            </TextField.Root>
          </View>
        ) : null}
        <View style={[a.gap_sm, gtMobile && [a.flex_row_reverse, a.ml_auto]]}>
          {currentStep === 'Reminder' ? (
            <>
              <Button
                label={_(msg`Get started`)}
                variant="solid"
                color="primary"
                size="large"
                onPress={() => setCurrentStep('StepOne')}>
                <ButtonText>
                  <Trans>Get started</Trans>
                </ButtonText>
              </Button>
              <Button
                label={_(msg`Maybe layer`)}
                accessibilityHint={_(msg`Snooze reminder`)}
                variant="solid"
                color="secondary"
                size="large"
                disabled={isProcessing}
                onPress={() => control.close()}>
                <ButtonText>
                  <Trans>Maybe later</Trans>
                </ButtonText>
              </Button>
            </>
          ) : currentStep === 'StepOne' ? (
            <>
              <Button
                label={_(msg`Send confirmation email`)}
                variant="solid"
                color="primary"
                size="large"
                disabled={isProcessing}
                onPress={onSendEmail}>
                <ButtonText>
                  <Trans>Send confirmation</Trans>
                </ButtonText>
                {isProcessing ? (
                  <Loader size="sm" style={[{color: 'white'}]} />
                ) : null}
              </Button>
              <Button
                label={_(msg`I have a code`)}
                variant="solid"
                color="secondary"
                size="large"
                disabled={isProcessing}
                onPress={() => setCurrentStep('StepTwo')}>
                <ButtonText>
                  <Trans>I have a code</Trans>
                </ButtonText>
              </Button>
            </>
          ) : currentStep === 'StepTwo' ? (
            <>
              <Button
                label={_(msg`Confirm`)}
                variant="solid"
                color="primary"
                size="large"
                disabled={isProcessing}
                onPress={onVerifyEmail}>
                <ButtonText>
                  <Trans>Confirm</Trans>
                </ButtonText>
                {isProcessing ? (
                  <Loader size="sm" style={[{color: 'white'}]} />
                ) : null}
              </Button>
              <Button
                label={_(msg`Resend email`)}
                variant="solid"
                color="secondary"
                size="large"
                disabled={isProcessing}
                onPress={() => {
                  setConfirmationCode('')
                  setCurrentStep('StepOne')
                }}>
                <ButtonText>
                  <Trans>Resend email</Trans>
                </ButtonText>
              </Button>
            </>
          ) : currentStep === 'StepThree' ? (
            <Button
              label={_(msg`Close`)}
              variant="solid"
              color="primary"
              size="large"
              onPress={() => control.close()}>
              <ButtonText>
                <Trans>Close</Trans>
              </ButtonText>
            </Button>
          ) : null}
        </View>
      </View>
    </Dialog.ScrollableInner>
  )
}
