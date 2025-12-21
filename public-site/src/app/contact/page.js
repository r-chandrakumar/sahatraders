'use client';

import { Card, Form, Input, Button, Breadcrumb } from 'antd';
import { HomeOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined, SendOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';

const { TextArea } = Input;

export default function ContactPage() {
  const [form] = Form.useForm();

  const handleSubmit = async (values) => {
    try {
      console.log('Contact form submitted:', values);
      toast.success('Message sent successfully! We will get back to you soon.');
      form.resetFields();
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container-custom py-4">
          <Breadcrumb
            items={[
              { href: '/', title: <><HomeOutlined /> Home</> },
              { title: 'Contact Us' }
            ]}
          />
        </div>
      </div>

      {/* Hero */}
      <div className="hero-gradient text-white py-12">
        <div className="container-custom text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Get in Touch</h1>
          <p className="text-white/90 max-w-2xl mx-auto">
            Have questions? We would love to hear from you. Send us a message and we will
            respond as soon as possible.
          </p>
        </div>
      </div>

      <div className="container-custom py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-6">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <PhoneOutlined className="text-2xl text-primary-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Call Us</h3>
              <p className="text-gray-600 mb-2">Mon - Sat: 9am - 7pm</p>
              <a href="tel:+919876543210" className="text-primary-600 font-semibold text-lg hover:text-primary-700">
                +91 98765 43210
              </a>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MailOutlined className="text-2xl text-primary-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Email Us</h3>
              <p className="text-gray-600 mb-2">We reply within 24 hours</p>
              <a href="mailto:contact@sahaatraders.com" className="text-primary-600 font-semibold hover:text-primary-700">
                contact@sahaatraders.com
              </a>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <EnvironmentOutlined className="text-2xl text-primary-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Visit Us</h3>
              <p className="text-gray-600">
                123 Market Street,<br />
                City, State - 123456
              </p>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card title="Send us a Message" className="shadow-lg">
              <Form form={form} layout="vertical" onFinish={handleSubmit}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Form.Item
                    name="name"
                    label="Your Name"
                    rules={[{ required: true, message: 'Please enter your name' }]}
                  >
                    <Input placeholder="Enter your name" size="large" />
                  </Form.Item>
                  <Form.Item
                    name="phone"
                    label="Phone Number"
                    rules={[{ required: true, message: 'Please enter your phone number' }]}
                  >
                    <Input placeholder="Enter your phone number" size="large" />
                  </Form.Item>
                </div>
                <Form.Item
                  name="email"
                  label="Email Address"
                  rules={[{ type: 'email', message: 'Please enter a valid email' }]}
                >
                  <Input placeholder="Enter your email address" size="large" />
                </Form.Item>
                <Form.Item
                  name="subject"
                  label="Subject"
                  rules={[{ required: true, message: 'Please enter a subject' }]}
                >
                  <Input placeholder="What is this about?" size="large" />
                </Form.Item>
                <Form.Item
                  name="message"
                  label="Message"
                  rules={[{ required: true, message: 'Please enter your message' }]}
                >
                  <TextArea rows={5} placeholder="Enter your message here..." />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" size="large" icon={<SendOutlined />} className="h-12 px-8">
                    Send Message
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </div>
        </div>

        {/* Map placeholder */}
        <div className="mt-12">
          <Card className="overflow-hidden">
            <div className="bg-gray-200 h-[400px] flex items-center justify-center">
              <div className="text-center text-gray-500">
                <EnvironmentOutlined className="text-5xl mb-4" />
                <p className="text-lg">Map Integration</p>
                <p className="text-sm">Google Maps or similar can be integrated here</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
