import { Request, Response } from 'express';

// Webhook handler for Tally Prime events
export const tallyWebhookHandler = (req: Request, res: Response) => {
    const event = req.body;

    // Process Tally Prime events here
    console.log('Received Tally Prime event:', event);

    // Send a response back to Tally
    res.status(200).send('Event received');
};

// Export the webhook handler
export default tallyWebhookHandler;