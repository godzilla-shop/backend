import { Request, Response } from 'express';
import { contactsService } from '../services/contacts.service';

export const getContacts = async (req: Request, res: Response) => {
    try {
        const { search, page, limit, onlyHistory, onlyActive } = req.query;
        const results = await contactsService.getAllContacts(
            search as string,
            Number(page || 1),
            Number(limit || 20),
            onlyHistory === 'true',
            onlyActive === 'true'
        );
        res.status(200).json(results);
    } catch (error: any) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch contacts' });
    }
};

export const createContact = async (req: Request, res: Response) => {
    try {
        const contact = await contactsService.createContact(req.body);
        res.status(201).json(contact);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create contact' });
    }
};
export const updateContact = async (req: Request, res: Response) => {
    try {
        const contact = await contactsService.updateContact(req.params.id as string, req.body);
        res.status(200).json(contact);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to update contact' });
    }
};

export const deleteContact = async (req: Request, res: Response) => {
    try {
        const result = await contactsService.deleteContact(req.params.id as string);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to delete contact' });
    }
};

export const bulkStatusUpdate = async (req: Request, res: Response) => {
    try {
        const { search, active } = req.body;
        const count = await contactsService.bulkUpdateStatus(search, active);
        res.status(200).json({ success: true, count });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to bulk update status' });
    }
};
